import uuid
from pathlib import Path

from bs4 import BeautifulSoup, Tag
from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.filesystem_repo import RepoService
from util.image_utils import base64_to_image

repo = RepoService()


def __extract_base64_images_from_html_docs(
    filepath: Path, content: str
) -> tuple[str, list[Path]]:
    """
    Extracts content from HTML documents and returns the HTML content along with a list of extracted image paths.

    Args:
        filepath (Path): The path to the HTML file.
        content (str): The raw HTML content of the document.

    Returns:
        tuple: A tuple containing the modified HTML content and a list of extracted image paths.
    """
    # Parse the HTML content
    soup = BeautifulSoup(content, "html.parser")

    # Extract base64 encoded images from the HTML content
    base64_images = {}
    for img_tag in soup.find_all("img"):
        src = img_tag.get("src", "")
        if src.startswith("data:image") and "base64," in src:
            base64_data = src.split("base64,")[1]
            unique_filename = f"{uuid.uuid4()}.png"
            base64_images[unique_filename] = base64_data
            img_tag["src"] = unique_filename  # Replace src with the filename

    # Store all extracted images in the same directory as the HTML
    extracted_images: list[Path] = []
    output_path = filepath.parent
    for img_fn, b64_img in base64_images.items():
        img_path = output_path / img_fn
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


def extract_content_in_html_from_html_docs(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    if pptd.mime_type not in ["text/html"]:
        return cargo

    content = pptd.filepath.read_text(encoding="utf-8")

    html, extracted_images = __extract_base64_images_from_html_docs(
        pptd.filepath, content
    )

    pptd.html = html
    pptd.extracted_images = extracted_images

    return cargo
