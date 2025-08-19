from pathlib import Path
from uuid import uuid4

import mammoth
from bs4 import BeautifulSoup, Tag
from common.doc_type import DocType
from common.job_type import JobType
from loguru import logger
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.html.html_cleaning_utils import clean_html
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job
from utils.image_utils import base64_to_image


class ExtractHTMLJobInput(SdocProcessingJobInput):
    filepath: Path
    doctype: DocType
    folder_id: int | None


class ExtractHTMLJobOutput(JobOutputBase):
    html: str
    image_paths: list[Path]
    folder_id: int | None


@register_job(
    job_type=JobType.EXTRACT_HTML,
    input_type=ExtractHTMLJobInput,
    output_type=ExtractHTMLJobOutput,
)
def handle_extract_html_job(
    payload: ExtractHTMLJobInput, job: Job
) -> ExtractHTMLJobOutput:
    if not payload.filepath.exists():
        logger.error(f"File {payload.filepath} does not exist!")
        raise Exception(f"File {payload.filepath} does not exist!")

    # TODO: these extractions have varying compute requirements when run across
    #       multiple machines or if GPU is used for PDFs via Docling etc.
    if payload.filepath.suffix == ".txt":
        doc_html, extracted_images = extract_html_from_text(payload)
    elif payload.filepath.suffix == ".docx" or payload.filepath.suffix == ".doc":
        doc_html, extracted_images = extract_html_from_word(payload)
    elif payload.filepath.suffix == ".pdf":
        doc_html, extracted_images = extract_html_from_pdf(payload)
    elif payload.filepath.suffix == ".html":
        doc_html, extracted_images = extract_html_from_html(payload)
    else:
        logger.error(f"Unsupported file type: {payload.filepath.suffix}")
        raise Exception(f"Unsupported file type: {payload.filepath.suffix}")

    # Clean HTML (may use readability, always uses heuristics)
    html = clean_html(doc_html)

    return ExtractHTMLJobOutput(
        html=html, image_paths=extracted_images, folder_id=payload.folder_id
    )


def extract_html_from_pdf(payload: ExtractHTMLJobInput) -> tuple[str, list[Path]]:
    logger.debug(f"Extracting content as HTML from {payload.filepath.name} ...")
    pdf_bytes = payload.filepath.read_bytes()
    # this will take some time ...
    conversion_output = RayRepo().docling_pdf_to_html(pdf_bytes=pdf_bytes)
    doc_html = conversion_output.html_content

    extracted_images: list[Path] = []

    if not payload.settings.extract_images:
        return doc_html, extracted_images

    # store all extracted images in the same directory as the PDF
    output_path = payload.filepath.parent
    for img_fn, b64_img in conversion_output.base64_images.items():
        img_fn = Path(img_fn)
        img_path = output_path / (img_fn.stem + ".png")
        img = base64_to_image(b64_img)
        img.save(img_path, format="PNG")
        extracted_images.append(img_path)
        logger.debug(
            f"Saved extracted image {img_path} from PDF {payload.filepath.name}."
        )

    return doc_html, extracted_images


def extract_html_from_text(payload: ExtractHTMLJobInput) -> tuple[str, list[Path]]:
    content = payload.filepath.read_text(encoding="utf-8")
    html_content = f"<html><body><p>{content}</p></body></html>"
    return html_content, []


def extract_html_from_word(payload: ExtractHTMLJobInput) -> tuple[str, list[Path]]:
    extracted_images: list[Path] = []

    def convert_image(image) -> dict[str, str]:
        if not payload.settings.extract_images:
            return {"src": ""}

        fn = payload.filepath.parent / f"image_{str(uuid4())}"
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

    with open(str(payload.filepath), "rb") as docx_file:
        html = mammoth.convert_to_html(
            docx_file, convert_image=mammoth.images.img_element(convert_image)
        )

    return f"<html><body>{html.value}</body></html>", extracted_images


def extract_html_from_html(payload: ExtractHTMLJobInput) -> tuple[str, list[Path]]:
    # Parse the HTML content
    content = payload.filepath.read_text(encoding="utf-8")
    soup = BeautifulSoup(content, "html.parser")

    extracted_images: list[Path] = []

    if not payload.settings.extract_images:
        # Remove all <img> tags from the HTML
        for img_tag in soup.find_all("img"):
            img_tag.decompose()
        return str(soup), extracted_images

    # Extract base64 encoded images from the HTML content
    base64_images = {}
    for img_tag in soup.find_all("img"):
        src = img_tag.get("src", "")
        if src.startswith("data:image") and "base64," in src:
            base64_data = src.split("base64,")[1]
            unique_filename = f"{uuid4()}.png"
            base64_images[unique_filename] = base64_data
            img_tag["src"] = unique_filename  # Replace src with the filename

    # Store all extracted images in the same directory as the HTML
    output_path = payload.filepath.parent
    for img_fn, b64_img in base64_images.items():
        img_path = output_path / img_fn
        try:
            img = base64_to_image(b64_img)
        except Exception as e:
            logger.error(
                f"Error decoding base64 image {img_fn} from {payload.filepath.name}: {e}"
            )
            # delete the image tag entirely from the HTML
            img_tag = soup.find("img", {"src": img_fn})
            if img_tag and isinstance(img_tag, Tag):
                img_tag.decompose()
            continue
        img.save(img_path, format="PNG")
        extracted_images.append(img_path)
        logger.debug(
            f"Saved extracted image {img_path} from HTML {payload.filepath.name}."
        )

    return str(soup), extracted_images
