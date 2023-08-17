import json

from loguru import logger
from psycopg2 import OperationalError
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
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
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=pptd.project_id, filename=pptd.filename
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)
    pptd.sdoc_id = sdoc_db_obj.id

    return sdoc_db_obj


def _persist_sdoc_metadata(
    db: Session, sdoc_db_obj: SourceDocumentORM, pptd: PreProTextDoc
) -> None:
    sdoc_id = sdoc_db_obj.id
    filename = sdoc_db_obj.filename
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    pptd.metadata["url"] = str(RepoService().get_sdoc_url(sdoc=sdoc))

    metadata_create_dtos = [
        # persist original filename
        SourceDocumentMetadataCreate(
            key="file_name",
            value=filename,
            source_document_id=sdoc_id,
            read_only=True,
        ),
        # persist name
        SourceDocumentMetadataCreate(
            key="name",
            value=filename,
            source_document_id=sdoc_id,
            read_only=False,
        ),
        # persist word frequencies
        SourceDocumentMetadataCreate(
            key="word_frequencies",
            value=json.dumps(pptd.word_freqs),
            source_document_id=sdoc_id,
            read_only=True,
        ),
    ]

    for key, value in pptd.metadata.items():
        metadata_create_dtos.append(
            SourceDocumentMetadataCreate(
                key=key,
                value=value,
                source_document_id=sdoc_id,
                read_only=True,
            )
        )

    crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)


def _create_adoc_for_system_user(
    db: Session, pptd: PreProTextDoc
) -> AnnotationDocumentORM:
    adoc_db = crud_adoc.read_by_sdoc_and_user(
        db=db, sdoc_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID, raise_error=False
    )
    if not adoc_db:
        adoc_create = AnnotationDocumentCreate(
            source_document_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID
        )
        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
    return adoc_db


def _persist_span_annotations(
    db: Session, adoc_db_obj: AnnotationDocumentORM, pptd: PreProTextDoc
) -> None:
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


def write_pptd_to_database(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, pptd=pptd)

            # persist SourceDocument Metadata
            _persist_sdoc_metadata(db=db, sdoc_db_obj=sdoc_db_obj, pptd=pptd)

            # create AnnotationDocument for system user
            adoc_db_obj = _create_adoc_for_system_user(db=db, pptd=pptd)

            # persist SpanAnnotations
            _persist_span_annotations(db=db, adoc_db_obj=adoc_db_obj, pptd=pptd)

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {pptd.filename}: {e}"
            )
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

            pptd.sdoc_id = sdoc_db_obj.id
    return cargo
