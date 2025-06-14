from pathlib import Path
from typing import Dict, List, Tuple
from uuid import uuid4

import mammoth
from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from config import conf
from loguru import logger

cc = conf.celery

repo = RepoService()


def __extract_content_in_html_from_word_docs(filepath: Path) -> Tuple[str, List[Path]]:
    if filepath.suffix != ".docx" and filepath.suffix != ".doc":
        logger.warning(f"File {filepath} is not a Word document!")
        return "", []

    extracted_images: List[Path] = []

    def convert_image(image) -> Dict[str, str]:
        if not cc.preprocessing.extract_images_from_docx:
            return {"src": ""}

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
            extracted_images.append(fn)
            return {"src": str(fn.name)}

    with open(str(filepath), "rb") as docx_file:
        html = mammoth.convert_to_html(
            docx_file, convert_image=mammoth.images.img_element(convert_image)
        )

    return f"<html><body>{html.value}</body></html>", extracted_images


def extract_content_in_html_from_word_docs(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    filepath = pptd.filepath

    if filepath.suffix not in [".docx", ".doc"]:
        return cargo

    logger.debug(f"Extracting content as HTML from {filepath.name} for ...")

    html, extracted_images = __extract_content_in_html_from_word_docs(filepath)
    extracted_images = (
        extracted_images if cc.preprocessing.extract_images_from_docx else []
    )

    pptd.html = html
    pptd.extracted_images = extracted_images

    return cargo
