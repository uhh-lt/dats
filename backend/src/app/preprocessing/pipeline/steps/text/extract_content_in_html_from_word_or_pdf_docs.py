from pathlib import Path
from typing import Dict
from uuid import uuid4

import fitz
import mammoth
from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from bs4 import BeautifulSoup
from loguru import logger

repo = RepoService()


def __extract_content_in_html_from_word_docs(filepath: Path) -> str:
    if filepath.suffix != ".docx" and filepath.suffix != ".doc":
        logger.warning(f"File {filepath} is not a Word document!")
        return ""

    def convert_image(image) -> Dict[str, str]:
        fn = filepath.parent / f"image_{str(uuid4())}"
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

            return {"src": str(fn)}

    with open(str(filepath), "rb") as docx_file:
        html = mammoth.convert_to_html(
            docx_file, convert_image=mammoth.images.img_element(convert_image)
        )

    return f"<html><body>{html.value}</body></html>"


def __extract_content_in_html_from_pdf_docs(filepath: Path) -> str:
    if filepath.suffix != ".pdf":
        logger.warning(f"File {filepath} is not a Word document!")
        return ""
    doc = fitz.open(str(filepath))  # type: ignore
    page_soups = []
    for page in doc:
        # extract images and save on disk
        img_names = []
        for img in page.get_images():
            xref = img[0]  # get the XREF of the image
            pix = fitz.Pixmap(doc, xref)  # create a Pixmap

            if pix.n - pix.alpha > 3:  # CMYK: convert to RGB first
                pix = fitz.Pixmap(fitz.csRGB, pix)

            fn = filepath.parent / f"image_{str(uuid4())}.png"
            pix.save(fn)
            img_names.append(fn)

        # get page text as html
        html = page.get_text("xhtml")
        soup = BeautifulSoup(html, "html.parser")
        for img_name, img_tag in zip(img_names, soup.find_all("img")):
            img_tag["src"] = img_name
            del img_tag["width"]
            del img_tag["height"]
        page_soups.append(soup)

    doc_html = "\n".join(map(lambda p: str(p), page_soups))
    return f"<html><body>{doc_html}</body></html>"


def extract_content_in_html_from_word_or_pdf_docs(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    filepath = pptd.filepath

    if filepath.suffix not in [".pdf", ".docx", ".doc"]:
        return cargo

    logger.debug(f"Extracting content as HTML from {filepath.name} for ...")

    if filepath.suffix == ".pdf":
        pptd.html = __extract_content_in_html_from_pdf_docs(filepath)
    elif filepath.suffix == ".docx" or filepath.suffix == ".doc":
        pptd.html = __extract_content_in_html_from_word_docs(filepath)
    else:
        return cargo

    return cargo
