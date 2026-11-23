from pathlib import Path
from uuid import uuid4

import mammoth
from bs4 import BeautifulSoup, Tag
from loguru import logger

from common.doc_type_enum import DocType
from core.artefacts.raw_html.html_cleaning_utils import clean_html
from core.artefacts.raw_html.raw_html_artefact import RAW_HTML
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc_processing.doc_processing_dto import SdocInitJobInput
from core.doc_processing.entrypoints.follower_utils import start_followers
from repos.db.sql_repo import SQLRepo
from repos.docling_repo import DoclingRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import base64_to_image

sqlr = SQLRepo()


class ExtractHTMLJobInput(SdocProcessingJobInput):
    filename: str
    doctype: DocType
    folder_id: int | None


class ExtractHTMLJobOutput(JobOutputBase):
    raw_html: str
    image_paths: list[Path]
    folder_id: int | None


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> ExtractHTMLJobInput:
    with sqlr.transaction() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )
        sdoc = sdoc_data.source_document
        assert crud_sdoc_file.exists(
            project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
        ), f"The file of SourceDocument {sdoc.id} does not exist!"

        return ExtractHTMLJobInput(
            **payload.model_dump(),
            filename=sdoc.filename,
            doctype=DocType(sdoc.doctype),
            folder_id=sdoc.folder_id,
        )


@pipeline_step(
    requires=set(),
    produces={RAW_HTML},
    doctypes={DocType.text},
)
@register_job(
    job_type="html_extraction",
    input_type=ExtractHTMLJobInput,
    output_type=ExtractHTMLJobOutput,
    enricher=enrich_for_recompute,
)
def handle_html_extraction_job(
    payload: ExtractHTMLJobInput, job: Job
) -> ExtractHTMLJobOutput:
    filepath = crud_sdoc_file.path(
        project_id=payload.project_id, id=payload.sdoc_id, name=payload.filename
    )
    if not filepath.exists():
        logger.error(f"File {filepath} does not exist!")
        raise Exception(f"File {filepath} does not exist!")

    # the extracted images are staged in a temporary folder, the handover to
    # the sdoc_init jobs that make them documents of their own
    staging_id = crud_temporary_file.create()
    image_dir = crud_temporary_file.dir(id=staging_id)

    # TODO: these extractions have varying compute requirements when run across
    #       multiple machines or if GPU is used for PDFs via Docling etc.
    if filepath.suffix == ".txt":
        doc_html, extracted_images = extract_html_from_text(filepath)
    elif filepath.suffix == ".docx" or filepath.suffix == ".doc":
        doc_html, extracted_images = extract_html_from_word(
            payload, filepath, image_dir
        )
    elif filepath.suffix == ".pdf":
        doc_html, extracted_images = extract_html_from_pdf(payload, filepath, image_dir)
    elif filepath.suffix == ".html":
        doc_html, extracted_images = extract_html_from_html(
            payload, filepath, image_dir
        )
    else:
        logger.error(f"Unsupported file type: {filepath.suffix}")
        raise Exception(f"Unsupported file type: {filepath.suffix}")
    if not extracted_images:
        crud_temporary_file.delete(id=staging_id)

    # Clean HTML (may use readability, always uses heuristics)
    raw_html = clean_html(doc_html)

    # Store HTML in sdoc data
    with sqlr.transaction() as db:
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(
                raw_html=raw_html,
            ),
        )

    # the extracted images become documents of their own
    start_followers(
        "html_extraction",
        [
            (
                "sdoc_init",
                SdocInitJobInput(
                    project_id=payload.project_id,
                    temporary_file_id=staging_id,
                    filename=path.name,
                    folder_id=payload.folder_id,
                    doctype=DocType.image,
                    settings=payload.settings,
                ),
            )
            for path in extracted_images
        ],
    )
    return ExtractHTMLJobOutput(
        raw_html=raw_html, image_paths=extracted_images, folder_id=payload.folder_id
    )


def __remove_img_tags(content: str) -> str:
    """
    Remove all <img> tags from the given HTML content and return the cleaned HTML as a string.
    """
    soup = BeautifulSoup(content, "html.parser")
    for img_tag in soup.find_all("img"):
        img_tag.decompose()
    return str(soup)


def __extract_html_and_images_from_html(
    html: str,
    extract_images: bool,
    filepath: Path,
    image_dir: Path,
) -> tuple[str, list[Path]]:
    # Parse the HTML content
    soup = BeautifulSoup(html, "html.parser")

    extracted_images: list[Path] = []

    if not extract_images:
        return __remove_img_tags(html), extracted_images

    # Extract base64 encoded images from the HTML content
    base64_images = {}
    for img_tag in soup.find_all("img"):
        src = img_tag.get("src", "")
        src = str(src)
        if src.startswith("data:image") and "base64," in src:
            base64_data = src.split("base64,")[1]
            unique_filename = f"{uuid4()}.png"
            base64_images[unique_filename] = base64_data
            img_tag["src"] = unique_filename  # Replace src with the filename

    # Store all extracted images in the image folder
    for img_fn, b64_img in base64_images.items():
        img_path = image_dir / img_fn
        try:
            img = base64_to_image(b64_img)
        except Exception as e:
            logger.error(
                f"Error decoding base64 image {img_fn} from {filepath.name}: {e}"
            )
            # delete the image tag entirely from the HTML
            img_tag = soup.find("img", {"src": img_fn})
            if img_tag and isinstance(img_tag, Tag):
                img_tag.decompose()
            continue
        img.save(img_path, format="PNG")
        extracted_images.append(img_path)
        logger.debug(f"Saved extracted image {img_path} from HTML {filepath.name}.")

    return str(soup), extracted_images


def extract_html_from_pdf(
    payload: ExtractHTMLJobInput, filepath: Path, image_dir: Path
) -> tuple[str, list[Path]]:
    logger.debug(f"Extracting content as HTML from PDF {filepath.name} ...")

    conversion_output = DoclingRepo().pdf2html(pdf_chunk=filepath)
    return __extract_html_and_images_from_html(
        html=conversion_output.html_content,
        extract_images=payload.settings.extract_images,
        filepath=filepath,
        image_dir=image_dir,
    )


def extract_html_from_text(filepath: Path) -> tuple[str, list[Path]]:
    """
    Convert a text file to HTML, preserving line breaks as paragraphs.

    Each non-empty line becomes a <p> element to maintain the original formatting.
    """
    logger.debug(f"Extracting content as HTML from TEXT {filepath.name} ...")

    content = filepath.read_text(encoding="utf-8")

    # Split by line breaks and wrap each non-empty line in <p> tags
    lines = content.split("\n")
    paragraphs = [f"<p>{line}</p>" for line in lines if line.strip()]

    html_content = f"<html><body>{''.join(paragraphs)}</body></html>"
    return html_content, []


def extract_html_from_word(
    payload: ExtractHTMLJobInput, filepath: Path, image_dir: Path
) -> tuple[str, list[Path]]:
    logger.debug(f"Extracting content as HTML from WORD {filepath.name} ...")

    extracted_images: list[Path] = []

    def convert_image(image) -> dict[str, str]:
        if not payload.settings.extract_images:
            return {"src": ""}

        fn = image_dir / f"image_{str(uuid4())}"
        if "png" in image.content_type:
            fn = fn.with_suffix(".png")
        elif "jpg" in image.content_type:
            fn = fn.with_suffix(".jpg")
        elif "jpeg" in image.content_type:
            fn = fn.with_suffix(".jpeg")
        else:
            return {"src": ""}

        with image.open() as image_bytes:
            with open(fn, "wb") as binary_file:
                binary_file.write(image_bytes.read())
            extracted_images.append(fn)
            return {"src": str(fn.name)}

    with open(str(filepath), "rb") as docx_file:
        html = mammoth.convert_to_html(
            docx_file, convert_image=mammoth.images.img_element(convert_image)
        )

    html_content = f"<html><body>{html.value}</body></html>"
    if not payload.settings.extract_images:
        # Remove all <img> tags from the HTML
        html_content = __remove_img_tags(html_content)
    return html_content, extracted_images


def extract_html_from_html(
    payload: ExtractHTMLJobInput, filepath: Path, image_dir: Path
) -> tuple[str, list[Path]]:
    logger.debug(f"Extracting content as HTML from HTML {filepath.name} ...")

    content = filepath.read_text(encoding="utf-8")
    return __extract_html_and_images_from_html(
        html=content,
        extract_images=payload.settings.extract_images,
        filepath=filepath,
        image_dir=image_dir,
    )
