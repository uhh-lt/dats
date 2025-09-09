from pathlib import Path

from common.doc_type import DocType
from common.job_type import JobType
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.llm_assistant.prompts.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

llm = LLMRepo()
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
    device="api",
)
def handle_image_caption_job(
    payload: ImageCaptionJobInput, job: Job
) -> ImageCaptionJobOutput:
    image = load_image(payload.filepath)
    image_b64 = image_to_base64(image)
    caption, _ = llm.vlm_chat(
        user_prompt=IMG_CAPTION_USER_PROMPT, b64_images=[image_b64]
    )

    with sqlr.db_session() as db:
        # Store caption in the database
        crud_sdoc_meta.update_multi_with_doctype(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.image,
            keys=["caption"],
            values=[caption],
        )

    return ImageCaptionJobOutput(
        text=caption, html=f"<html><body><p>{caption}</p></body></html>"
    )
