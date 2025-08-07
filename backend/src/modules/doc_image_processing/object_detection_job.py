from pathlib import Path
from uuid import uuid4

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreateIntern
from core.code.code_crud import crud_code
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.user.user_crud import SYSTEM_USER_ID
from loguru import logger
from ray_model_worker.dto.detr import DETRImageInput
from repos.db.sql_repo import SQLRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

ray = RayRepo()
sqlr = SQLRepo()


class ObjectDetectionJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path


@register_job(
    job_type="object_detection",
    input_type=ObjectDetectionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_object_detection_job(payload: ObjectDetectionJobInput, job: Job) -> None:
    # Run object detection with ray
    input = DETRImageInput(
        base64_image=image_to_base64(load_image(payload.filepath)),
    )
    result = ray.detr_object_detection(input)
    logger.info(f"Found following objects: {result.bboxes}")

    # Store bboxes in the database
    with sqlr.db_session() as db:
        # query required data from db
        system_code_ids = {
            code.name: code.id
            for code in crud_code.read_system_codes_by_project(
                db=db, proj_id=payload.project_id
            )
        }
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=payload.sdoc_id
        )

        # convert to BBoxAnnotationCreate
        create_dtos = [
            BBoxAnnotationCreateIntern(
                x_min=box.x_min,
                y_min=box.y_min,
                x_max=box.x_max,
                y_max=box.y_max,
                code_id=system_code_ids[box.label],
                uuid=str(uuid4()),
                project_id=payload.project_id,
                annotation_document_id=adoc.id,
            )
            for box in result.bboxes
            if box.label in system_code_ids
        ]

        # store bboxes in db
        crud_bbox_anno.create_multi(
            db=db,
            create_dtos=create_dtos,
        )

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(object_detection=True),
        )
