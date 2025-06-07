import logging
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc.base import ImageRefMode
from dto.docling import DoclingPDF2HTMLOutput
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from utils import create_docling_pdf_conversion_output

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
        conversion_output = create_docling_pdf_conversion_output(
            html_filename=html_filename,
            out_dir=out_dir,
        )
        return conversion_output
