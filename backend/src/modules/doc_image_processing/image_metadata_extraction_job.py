from pathlib import Path

from common.doc_type import DocType
from common.meta_type import MetaType
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from PIL import Image
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class ImageMetadataExtractionJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path
    doctype: DocType


@register_job(
    job_type="image_metadata_extraction",
    input_type=ImageMetadataExtractionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_image_metadata_extraction_job(
    payload: ImageMetadataExtractionJobInput, job: Job
) -> None:
    with Image.open(payload.filepath) as img:
        width = str(img.width)
        height = str(img.height)
        format = str(img.format)
        mode = str(img.mode)

    with sqlr.db_session() as db:
        # TODO: Metadata service? :D
        # read the required project metadata
        width_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="width",
                metatype=MetaType.NUMBER,
                doctype=payload.doctype,
            )
        )
        assert width_project_metadata is not None, "Width metadata does not exist!"
        width_meta = SourceDocumentMetadataCreate.with_metatype(
            value=width,
            source_document_id=payload.sdoc_id,
            project_metadata_id=width_project_metadata.id,
            metatype=width_project_metadata.metatype,
        )

        # read the required project metadata
        height_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="height",
                metatype=MetaType.NUMBER,
                doctype=payload.doctype,
            )
        )
        assert height_project_metadata is not None, "Height metadata does not exist!"
        height_meta = SourceDocumentMetadataCreate.with_metatype(
            value=height,
            source_document_id=payload.sdoc_id,
            project_metadata_id=height_project_metadata.id,
            metatype=height_project_metadata.metatype,
        )

        # read the required project metadata
        format_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="format",
                metatype=MetaType.STRING,
                doctype=payload.doctype,
            )
        )
        assert format_project_metadata is not None, "Format metadata does not exist!"
        format_meta = SourceDocumentMetadataCreate.with_metatype(
            value=format,
            source_document_id=payload.sdoc_id,
            project_metadata_id=format_project_metadata.id,
            metatype=format_project_metadata.metatype,
        )

        # read the required project metadata
        mode_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="mode",
                metatype=MetaType.STRING,
                doctype=payload.doctype,
            )
        )
        assert mode_project_metadata is not None, "Mode metadata does not exist!"
        mode_meta = SourceDocumentMetadataCreate.with_metatype(
            value=mode,
            source_document_id=payload.sdoc_id,
            project_metadata_id=mode_project_metadata.id,
            metatype=mode_project_metadata.metatype,
        )

        # Store metadata in db
        crud_sdoc_meta.create_multi(
            db=db,
            create_dtos=[width_meta, height_meta, format_meta, mode_meta],
        )

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(image_metadata=True),
        )
