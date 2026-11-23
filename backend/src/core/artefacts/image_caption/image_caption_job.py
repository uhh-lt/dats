from common.doc_type_enum import DocType
from core.artefacts.image_caption.image_caption_artefact import IMAGE_CAPTION
from core.artefacts.image_caption.image_captioning_prompt import (
    IMG_CAPTION_USER_PROMPT,
)
from core.artefacts.raw_html.raw_html_artefact import RAW_HTML
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_file_crud import crud_sdoc_file
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import image_to_base64, load_image

llm = LLMRepo()
sqlr = SQLRepo()


class ImageCaptionJobInput(SdocProcessingJobInput):
    filename: str


class ImageCaptionJobOutput(JobOutputBase):
    text: str
    raw_html: str


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ImageCaptionJobInput:
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
    return ImageCaptionJobInput(**payload.model_dump(), filename=sdoc.filename)


@pipeline_step(
    requires=set(),
    produces={IMAGE_CAPTION, RAW_HTML},
    doctypes={DocType.image},
)
@register_job(
    job_type="image_caption",
    input_type=ImageCaptionJobInput,
    output_type=ImageCaptionJobOutput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_image_caption_job(
    payload: ImageCaptionJobInput, job: Job
) -> ImageCaptionJobOutput:
    filepath = crud_sdoc_file.path(
        project_id=payload.project_id, id=payload.sdoc_id, name=payload.filename
    )
    image = load_image(filepath)
    image_b64 = image_to_base64(image)
    caption, _ = llm.vlm_chat(
        model=payload.settings.model,
        user_prompt=IMG_CAPTION_USER_PROMPT,
        b64_images=[image_b64],
    )
    raw_html = f"<html><body><p>{caption}</p></body></html>"

    with sqlr.transaction() as db:
        # Store caption in the database
        IMAGE_CAPTION.store.write(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=DocType.image,
            values={"caption": caption},
        )

        # Store caption as raw_html in sdoc data
        RAW_HTML.store.write(
            db=db,
            sdoc_id=payload.sdoc_id,
            update=SourceDocumentDataUpdate(raw_html=raw_html),
        )

    return ImageCaptionJobOutput(text=caption, raw_html=raw_html)
