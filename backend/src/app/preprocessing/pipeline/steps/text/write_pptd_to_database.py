import traceback

import srsly
from loguru import logger
from psycopg2 import OperationalError
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.crud.word_frequency import crud_word_frequency
from app.core.data.doc_type import DocType
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.dto.word_frequency import WordFrequencyCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.util.color import get_next_color

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def _create_and_persist_sdoc(db: Session, pptd: PreProTextDoc) -> SourceDocumentORM:
    logger.info(f"Persisting SourceDocument for {pptd.filename}...")
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=pptd.project_id,
        filename=pptd.filename,
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return sdoc_db_obj


def _persist_sdoc_data(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    word_frequencies_str = srsly.json_dumps(
        [{"word": word, "count": count} for word, count in pptd.word_freqs.items()]
    )

    sdoc_data = SourceDocumentDataCreate(
        id=sdoc_db_obj.id,
        content=pptd.text,
        html=pptd.html,
        token_starts=[s for s, _ in pptd.token_character_offsets],
        token_ends=[e for _, e in pptd.token_character_offsets],
        sentence_starts=[s.start for s in pptd.sentences],
        sentence_ends=[s.end for s in pptd.sentences],
        word_frequencies=word_frequencies_str,
    )
    crud_sdoc_data.create(db=db, create_dto=sdoc_data)


def _persist_sdoc_metadata(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    logger.info(f"Persisting SourceDocument Metadata for {pptd.filename}...")
    sdoc_id = sdoc_db_obj.id
    sdoc = SourceDocumentRead.model_validate(sdoc_db_obj)
    pptd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))
    pptd.metadata["keywords"] = pptd.keywords

    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project.read(db=db, id=pptd.project_id).metadata_
        if pm.doctype == DocType.text
    ]
    project_metadata_map = {str(m.key): m for m in project_metadata}

    # we create SourceDocumentMetadata for every project metadata
    metadata_create_dtos = []
    for project_metadata_key, project_metadata in project_metadata_map.items():
        if project_metadata_key in pptd.metadata.keys():
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    value=pptd.metadata[project_metadata_key],
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )
        else:
            metadata_create_dtos.append(
                SourceDocumentMetadataCreate.with_metatype(
                    source_document_id=sdoc_id,
                    project_metadata_id=project_metadata.id,
                    metatype=project_metadata.metatype,
                )
            )

    crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)


def _persist_sdoc_links(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    logger.info(f"Persisting SourceDocument Links for {pptd.filename}...")
    # we have to set the parent source document id for the links
    sdoc_id = sdoc_db_obj.id
    for link_create_dto in pptd.sdoc_link_create_dtos:
        link_create_dto.parent_source_document_id = sdoc_id

    crud_sdoc_link.create_multi(db=db, create_dtos=pptd.sdoc_link_create_dtos)


def _create_adoc_for_system_user(
    db: Session, pptd: PreProTextDoc, sdoc_db_obj: SourceDocumentORM
) -> AnnotationDocumentORM:
    logger.info(f"Creating AnnotationDocument for {pptd.filename}...")
    sdoc_id = sdoc_db_obj.id
    try:
        adoc_db = crud_adoc.read_by_sdoc_and_user(
            db=db, sdoc_id=sdoc_id, user_id=SYSTEM_USER_ID
        )
    except NoSuchElementError:
        adoc_db = None

    if not adoc_db:
        adoc_create = AnnotationDocumentCreate(
            source_document_id=sdoc_id, user_id=SYSTEM_USER_ID
        )
        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
    return adoc_db


def _persist_span_annotations(
    db: Session, adoc_db_obj: AnnotationDocumentORM, pptd: PreProTextDoc
) -> None:
    logger.info(f"Persisting SpanAnnotations for {pptd.filename}...")
    # convert AutoSpans to SpanAnnotations
    for code in pptd.spans.keys():
        code_name = code
        # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
        if code_name == "PER":
            code_name = "PERSON"
        db_code = crud_code.read_by_name_and_user_and_project(
            db,
            code_name=code_name,
            user_id=SYSTEM_USER_ID,
            proj_id=pptd.project_id,
        )
        if not db_code:
            logger.warning(f"No Code <{code_name}> found! Creating it on the fly...")
            # create code on the fly for system user
            create_dto = CodeCreate(
                name=code_name,
                color=get_next_color(),
                description=code_name,
                project_id=pptd.project_id,
                user_id=SYSTEM_USER_ID,
            )
            db_code = crud_code.create(db, create_dto=create_dto)

        ccid = db_code.current_code.id

        create_dtos = [
            SpanAnnotationCreate(
                begin=aspan.start,
                end=aspan.end,
                current_code_id=ccid,
                annotation_document_id=adoc_db_obj.id,
                span_text=aspan.text,
                begin_token=aspan.start_token,
                end_token=aspan.end_token,
            )
            for aspan in pptd.spans[code]
        ]
        try:
            crud_span_anno.create_multi(db, create_dtos=create_dtos)
        except OperationalError as e:
            logger.error(
                "Cannot store SpanAnnotations of "
                f"SourceDocument {adoc_db_obj.source_document_id}: {e}"
            )
            raise e


def _persist_sdoc_word_frequencies(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    logger.info(f"Persisting SourceDocument Word Frequencies for {pptd.filename}...")
    sdoc_id = sdoc_db_obj.id
    word_freqs = pptd.word_freqs

    wfs_create_dtos = []
    for word, count in word_freqs.items():
        wfs_create_dtos.append(
            WordFrequencyCreate(
                sdoc_id=sdoc_id,
                word=word,
                count=count,
            )
        )

    crud_word_frequency.create_multi(db=db, create_dtos=wfs_create_dtos)


def write_pptd_to_database(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, pptd=pptd)

            # persists SourceDocument Data
            _persist_sdoc_data(db, sdoc_db_obj, pptd)

            # persist SourceDocument Metadata
            _persist_sdoc_metadata(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd)

            # persist SourceDocument Links
            _persist_sdoc_links(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd)

            # create AnnotationDocument for system user
            adoc_db_obj = _create_adoc_for_system_user(
                db=db, pptd=pptd, sdoc_db_obj=sdoc_db_obj
            )

            # persist SpanAnnotations
            _persist_span_annotations(db=db, adoc_db_obj=adoc_db_obj, pptd=pptd)

            # persist WordFrequencies
            _persist_sdoc_word_frequencies(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd)

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {pptd.filename}"
            )
            traceback.print_exception(e)
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(
                f"Persisted PreprocessingPipeline Results " f"for {pptd.filename}!"
            )

            cargo.data["sdoc_id"] = sdoc_db_obj.id

    return cargo
