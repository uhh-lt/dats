from uuid import uuid4

from loguru import logger

from common.doc_type_enum import DocType
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreateIntern
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_file_crud import crud_sdoc_file
from modules.object_detection.object_detection_artefact import OBJECT_BBOXES
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.detr import DETRImageInput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

ray = RayRepo()
sqlr = SQLRepo()

# the code of a DETR label whose code is not named like it
LABEL_CODES = {"PERSON": "HUMAN"}


class ObjectDetectionJobInput(SdocProcessingJobInput):
    filename: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ObjectDetectionJobInput:
    with sqlr.transaction() as db:
        sdoc = SourceDocumentRead.model_validate(
            crud_sdoc.read(db=db, id=payload.sdoc_id)
        )
        assert sdoc.doctype == DocType.image, (
            f"SourceDocument with {payload.sdoc_id=} is not an image!"
        )

    assert crud_sdoc_file.exists(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
    ), f"The file of SourceDocument {sdoc.id} does not exist!"
    return ObjectDetectionJobInput(**payload.model_dump(), filename=sdoc.filename)


@pipeline_step(
    requires=set(),
    produces={OBJECT_BBOXES},
    doctypes={DocType.image},
)
@register_job(
    job_type="object_detection",
    input_type=ObjectDetectionJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_object_detection_job(payload: ObjectDetectionJobInput, job: Job) -> None:
    filepath = crud_sdoc_file.path(
        project_id=payload.project_id, id=payload.sdoc_id, name=payload.filename
    )
    # Run object detection with ray
    input = DETRImageInput(
        base64_image=image_to_base64(load_image(filepath)),
    )
    result = ray.detr_object_detection(input)
    logger.info(f"Found following objects: {result.bboxes}")

    # Store bboxes in the database
    with sqlr.transaction() as trans:
        store = OBJECT_BBOXES.store
        system_code_ids = store.code_ids(db=trans, project_id=payload.project_id)
        adoc_id = store.annotation_document_id(db=trans, sdoc_id=payload.sdoc_id)

        # convert to BBoxAnnotationCreate
        create_dtos = [
            BBoxAnnotationCreateIntern(
                x_min=box.x_min,
                y_min=box.y_min,
                x_max=box.x_max,
                y_max=box.y_max,
                code_id=system_code_ids[LABEL_CODES.get(box.label, box.label)],
                uuid=str(uuid4()),
                project_id=payload.project_id,
                annotation_document_id=adoc_id,
            )
            for box in result.bboxes
            if LABEL_CODES.get(box.label, box.label) in system_code_ids
        ]

        # replace the system user's boxes, keeping the boxes of all users
        store.replace(
            db=trans,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            bboxes=create_dtos,
        )
