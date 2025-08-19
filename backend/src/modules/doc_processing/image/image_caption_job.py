from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from common.meta_type import MetaType
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.llm_assistant.prompts.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from repos.db.sql_repo import SQLRepo
from repos.ollama_repo import OllamaRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

ollama = OllamaRepo()
sqlr = SQLRepo()


class ImageCaptionJobInput(SdocProcessingJobInput):
    filepath: Path


class ImageCaptionJobOutput(JobOutputBase):
    text: str
    html: str


@register_job(
    job_type=JobType.IMAGE_CAPTION,
    input_type=ImageCaptionJobInput,
    output_type=ImageCaptionJobOutput,
    device="gpu",
)
def handle_image_caption_job(
    payload: ImageCaptionJobInput, job: Job
) -> ImageCaptionJobOutput:
    image = load_image(payload.filepath)
    image_b64 = image_to_base64(image)
    caption, _ = ollama.vlm_chat(
        user_prompt=IMG_CAPTION_USER_PROMPT, b64_images=[image_b64]
    )

    with sqlr.db_session() as db:
        # Store caption in the database
        lang_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="caption",
                metatype=MetaType.STRING,
                doctype=DocType.image,
            )
        )
        assert lang_project_metadata is not None, "Language metadata does not exist!"
        crud_sdoc_meta.create(
            db=db,
            create_dto=SourceDocumentMetadataCreate.with_metatype(
                value=caption,
                source_document_id=payload.sdoc_id,
                project_metadata_id=lang_project_metadata.id,
                metatype=MetaType.STRING,
            ),
        )
    return ImageCaptionJobOutput(
        text=caption, html=f"<html><body><p>{caption}</p></body></html>"
    )
