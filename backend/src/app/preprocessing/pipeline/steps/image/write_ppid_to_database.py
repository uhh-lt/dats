from typing import List

from loguru import logger
from psycopg2 import OperationalError
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationCreateIntern,
)
from app.core.data.dto.code import CodeCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.util.color import get_next_color

repo: RepoService = RepoService()
sql: SQLService = SQLService()


def _create_and_persist_sdoc(db: Session, ppid: PreProImageDoc) -> SourceDocumentORM:
    # generate the create_dto
    _, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=ppid.project_id, filename=ppid.filename
    )
    # persist SourceDocument
    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return sdoc_db_obj


def _create_adoc_for_system_user(
    db: Session, ppid: PreProImageDoc, sdoc_db_obj: SourceDocumentORM
) -> AnnotationDocumentORM:
    return crud_adoc.exists_or_create(
        db=db, sdoc_id=sdoc_db_obj.id, user_id=SYSTEM_USER_ID
    )


def _persist_bbox__annotations(
    db: Session, adoc_db_obj: AnnotationDocumentORM, ppid: PreProImageDoc
) -> None:
    # convert AutoBBoxes to BBoxAnnotationCreate
    create_dtos: List[BBoxAnnotationCreateIntern] = []
    for bbox in ppid.bboxes:
        db_code = crud_code.read_by_name_and_user_and_project(
            db,
            code_name=bbox.code,
            user_id=SYSTEM_USER_ID,
            proj_id=ppid.project_id,
        )

        if not db_code:
            logger.warning(f"No Code <{bbox.code}> found! Creating it on the fly...")
            # create code on the fly for system user
            create_dto = CodeCreate(
                name=bbox.code,
                color=get_next_color(),
                description=bbox.code,
                project_id=ppid.project_id,
                user_id=SYSTEM_USER_ID,
            )
            db_code = crud_code.create(db, create_dto=create_dto)

        ccid = db_code.current_code.id

        create_dto = BBoxAnnotationCreateIntern(
            x_min=bbox.x_min,
            x_max=bbox.x_max,
            y_min=bbox.y_min,
            y_max=bbox.y_max,
            current_code_id=ccid,
            adoc_id=adoc_db_obj.id,
        )

        create_dtos.append(create_dto)

    try:
        crud_bbox_anno.create_multi(db, create_dtos=create_dtos)
    except OperationalError as e:
        logger.error(
            "Cannot store SpanAnnotations of "
            f"SourceDocument {adoc_db_obj.source_document_id}: {e}"
        )
        raise e


def write_ppid_to_database(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    with sql.db_session() as db:
        try:
            # create and persist SourceDocument
            sdoc_db_obj = _create_and_persist_sdoc(db=db, ppid=ppid)

            # create AnnotationDocument for system user
            adoc_db_obj = _create_adoc_for_system_user(
                db=db, ppid=ppid, sdoc_db_obj=sdoc_db_obj
            )

            # persist BBoxAnnotations
            _persist_bbox__annotations(
                db=db,
                adoc_db_obj=adoc_db_obj,
                ppid=ppid,
            )

        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {ppid.filename}: {e}"
            )
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
        else:
            logger.info(
                f"Persisted PreprocessingPipeline Results " f"for {ppid.filename}!"
            )

            cargo.data["sdoc_id"] = sdoc_db_obj.id
    return cargo
