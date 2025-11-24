from pathlib import Path
from uuid import uuid4

from loguru import logger

from common.doc_type import DocType
from common.job_type import JobType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreateIntern
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.user.user_crud import SYSTEM_USER_ID
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.ray.dto.detr import DETRImageInput
from repos.ray.ray_repo import RayRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

fsr = FilesystemRepo()
ray = RayRepo()
sqlr = SQLRepo()


class ObjectDetectionJobInput(SdocProcessingJobInput):
    filepath: Path


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ObjectDetectionJobInput:
    with sqlr.db_session() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.image, (
            f"SourceDocument with {payload.sdoc_id=} is not an image!"
        )

    image_path = fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)

    return ObjectDetectionJobInput(
        **payload.model_dump(),
        filepath=image_path,
    )


@register_job(
    job_type=JobType.IMAGE_OBJECT_DETECTION,
    input_type=ObjectDetectionJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_object_detection_job(payload: ObjectDetectionJobInput, job: Job) -> None:
    # Run object detection with ray
    input = DETRImageInput(
        base64_image=image_to_base64(load_image(payload.filepath)),
    )
    result = ray.detr_object_detection(input)
    logger.info(f"Found following objects: {result.bboxes}")

    # Store bboxes in the database
    with sqlr.transaction() as trans:
        # query required data from db
        system_code_ids = {
            code.name: code.id
            for code in crud_code.read_system_codes_by_project(
                db=trans, proj_id=payload.project_id
            )
        }
        adoc = crud_adoc.exists_or_create(
            db=trans,
            user_id=SYSTEM_USER_ID,
            sdoc_id=payload.sdoc_id,
            manual_commit=True,
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
        crud_bbox_anno.delete_by_adoc(
            db=trans,
            adoc_id=adoc.id,
            manual_commit=True,
        )
        crud_bbox_anno.create_multi(
            db=trans,
            create_dtos=create_dtos,
            manual_commit=True,
        )
