from pathlib import Path

from common.doc_type import DocType
from common.meta_type import MetaType
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from modules.llm_assistant.prompts.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from repos.db.sql_repo import SQLRepo
from repos.ollama_repo import OllamaRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

ollama = OllamaRepo()
sqlr = SQLRepo()


class ImageCaptionJobInput(JobInputBase):
    sdoc_id: int
    filepath: Path


@register_job(
    job_type="image_caption",
    input_type=ImageCaptionJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_image_caption_job(payload: ImageCaptionJobInput, job: Job) -> None:
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

        # Set db status
        crud_sdoc_status.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(image_caption=True),
        )
