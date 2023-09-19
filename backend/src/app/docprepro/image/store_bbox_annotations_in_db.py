from typing import List

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import (
    AnnotationDocumentCreate,
    AnnotationDocumentRead,
)
from app.core.data.dto.bbox_annotation import BBoxAnnotationCreate
from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.util import update_sdoc_status
from loguru import logger
from tqdm import tqdm

sql = SQLService(echo=False)


def store_bbox_annotations_in_db_(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    with sql.db_session() as db:

        for ppid in tqdm(ppids, desc="Persisting automatic BBox Annotations..."):
            # create AnnoDoc for system user
            adoc_create = AnnotationDocumentCreate(
                source_document_id=ppid.sdoc_id, user_id=SYSTEM_USER_ID
            )

            adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
            adoc_read = AnnotationDocumentRead.from_orm(adoc_db)

            # convert AutoBBoxes to BBoxAnnotations
            for bbox in ppid.bboxes:
                db_code = crud_code.read_by_name_and_user_and_project(
                    db,
                    code_name=bbox.code,
                    user_id=SYSTEM_USER_ID,
                    proj_id=ppid.project_id,
                )

                if not db_code:
                    # FIXME FLO: create code on the fly for system user?
                    logger.warning(
                        f"No Code <{bbox.code}> found! Skipping persistence of BBoxAnnotation ..."
                    )
                    continue

                ccid = db_code.current_code.id

                create_dto = BBoxAnnotationCreate(
                    x_min=bbox.x_min,
                    x_max=bbox.x_max,
                    y_min=bbox.y_min,
                    y_max=bbox.y_max,
                    current_code_id=ccid,
                    annotation_document_id=adoc_read.id,
                )

                crud_bbox_anno.create(db, create_dto=create_dto)
            update_sdoc_status(
                sdoc_id=ppid.sdoc_id,
                sdoc_status=SDocStatus.store_bbox_annotations_in_db,
            )
    return ppids
