import logging
from pathlib import Path

from bs4 import BeautifulSoup
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc.base import ImageRefMode
from ray import serve

from config import build_ray_model_deployment_config, conf
from dto.docling import DoclingPDF2HTMLOutput
from utils import image_to_base64

cc = conf.docling

IMG_RES_SCALE = cc.image_resolution_scale
TMP_DIR = Path(cc.tmp_dir)

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("docling"))
class DoclingModel:
    def __init__(
        self,
    ) -> None:
        logger.info("Initializing Docling ...")
        pipeline_options = PdfPipelineOptions()
        pipeline_options.images_scale = IMG_RES_SCALE
        pipeline_options.generate_picture_images = True
        pipeline_options.generate_page_images = True

        doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        # this initalizes and loades the models to GPU
        doc_converter.initialize_pipeline(InputFormat.PDF)
        self.doc_converter = doc_converter

    def __read_html_and_replace_absolute_image_paths(
        self,
        html_filename: Path,
        rel_to: Path,
    ) -> str:
        if (
            not html_filename.exists()
            or not html_filename.is_file()
            or not html_filename.suffix.lower() == ".html"
        ):
            raise ValueError(f"Input file {html_filename} is not a valid HTML file.")
        if not rel_to.exists() or not rel_to.is_dir():
            raise ValueError(
                f"Relative path {rel_to} does not exist or is not a directory."
            )
        # load html and replace absolute image paths with relative ones
        html_content = html_filename.read_text(encoding="utf-8")
        soup = BeautifulSoup(html_content, "html.parser")
        for img in soup.find_all("img"):
            img_src = Path(img["src"])  # type: ignore
            if img_src.is_absolute():
                img["src"] = str(img_src.relative_to(rel_to))  # type: ignore
        html_content = str(soup)
        return html_content

    def __create_docling_pdf_conversion_output(
        self,
        html_filename: Path,
        out_dir: Path,
    ) -> DoclingPDF2HTMLOutput:
        html_content = self.__read_html_and_replace_absolute_image_paths(
            html_filename,
            out_dir,
        )

        base64_images = {}
        for img_path in out_dir.glob("**/*.png"):
            base64_images[img_path.name] = image_to_base64(img_path)

        return DoclingPDF2HTMLOutput(
            html_content=html_content,
            base64_images=base64_images,
        )

    def pdf2html(self, pdf_chunk: Path) -> DoclingPDF2HTMLOutput:
        # Here we assume that the pdf_chunk is a valid PDF file chunk
        if (
            not pdf_chunk.exists()
            or not pdf_chunk.is_file()
            or not pdf_chunk.suffix.lower() == ".pdf"
        ):
            raise ValueError(f"Input document {pdf_chunk} is not a valid PDF file.")

        # create tmp dir for the conversion
        doc_uuid = pdf_chunk.stem
        out_dir = TMP_DIR / f"{doc_uuid}_output"
        out_dir.mkdir(exist_ok=True, parents=True)

        logger.info(f"Converting PDF {pdf_chunk} with Docling in {out_dir} ...")
        conv_res = self.doc_converter.convert(pdf_chunk)

        # Save HTML with externally referenced pictures
        logger.info(f"Saving HTML and images for {pdf_chunk} ...")
        html_filename = out_dir / pdf_chunk.with_suffix(".html").name
        conv_res.document.save_as_html(
            filename=html_filename,
            image_mode=ImageRefMode.REFERENCED,
            artifacts_dir=out_dir,
        )

        logger.info(f"Creating Docling PDF conversion output for {pdf_chunk} ...")
        conversion_output = self.__create_docling_pdf_conversion_output(
            html_filename=html_filename,
            out_dir=out_dir,
        )
        return conversion_output
