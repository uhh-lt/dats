from typing import Dict, Set

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreate
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.doc.source_document_crud import crud_sdoc
from loguru import logger
from preprocessing.pipeline.model.image.autobbox import AutoBBox
from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from psycopg2 import OperationalError
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from sqlalchemy.orm import Session
from utils.color_utils import get_next_color

fsr: FilesystemRepo = FilesystemRepo()
sql: SQLRepo = SQLRepo()


def __persist_bbox_annotations(db: Session, sdoc_id: int, ppid: PreProImageDoc) -> None:
    # convert AutoBBoxes to BBoxAnnotationCreate
    for code_name in ppid.bboxes.keys():
        db_code = crud_code.read_by_name_and_project(
            db,
            code_name=code_name,
            proj_id=ppid.project_id,
        )

        if not db_code:
            logger.warning(f"No Code <{code_name}> found! Creating it on the fly...")
            # create code on the fly for system user
            create_dto = CodeCreate(
                name=code_name,
                color=get_next_color(),
                description=code_name,
                project_id=ppid.project_id,
                is_system=True,
            )
            db_code = crud_code.create(db, create_dto=create_dto)

        # group by user
        grouped_by_user_bboxes: Dict[int, Set[AutoBBox]] = dict()
        for bbox in ppid.bboxes[code_name]:
            if bbox.user_id not in grouped_by_user_bboxes:
                grouped_by_user_bboxes[bbox.user_id] = set()
            grouped_by_user_bboxes[bbox.user_id].add(bbox)

        # for every user and for every code create bulk dtos.
        for user_id, bboxes in grouped_by_user_bboxes.items():
            create_dtos = [
                BBoxAnnotationCreate(
                    x_min=bbox.x_min,
                    x_max=bbox.x_max,
                    y_min=bbox.y_min,
                    y_max=bbox.y_max,
                    code_id=db_code.id,
                    sdoc_id=sdoc_id,
                )
                for bbox in bboxes
            ]
            try:
                crud_bbox_anno.create_bulk(db, user_id=user_id, create_dtos=create_dtos)
            except OperationalError as e:
                logger.error(
                    f"Cannot store SpanAnnotations of SourceDocument {sdoc_id}: {e}"
                )
                raise e


def persist_bbox_annotations(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    with sql.db_session() as db:
        try:
            # read SourceDocument
            sdoc_db_obj = crud_sdoc.read(db=db, id=cargo.data["sdoc_id"])

            # persist BBoxAnnotations
            __persist_bbox_annotations(
                db=db,
                sdoc_id=sdoc_db_obj.id,
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
            logger.info(f"Persisted bbox annotations for {ppid.filename}!")
    return cargo
