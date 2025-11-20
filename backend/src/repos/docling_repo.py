from pathlib import Path

import httpx
from loguru import logger
from pydantic import BaseModel, Field

from common.singleton_meta import SingletonMeta
from config import conf


class DoclingPDF2HTMLOutput(BaseModel):
    html_content: str = Field(
        description="The HTML content of the converted PDF document.",
        examples=["<html><body><h1>Converted PDF</h1></body></html>"],
    )


class DoclingRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            url = f"http://{conf.docling.host}:{conf.docling.port}"

            # test connection to docling serve
            with httpx.Client(timeout=10) as client:
                resp = client.get(url + "/health")
                resp.raise_for_status()

            cls.url = url

        except Exception as e:
            msg = f"Cannot instantiate DoclingRepo - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully connected to Docling Serve!")

        return super(DoclingRepo, cls).__new__(cls)

    def pdf2html(self, pdf_chunk: Path) -> DoclingPDF2HTMLOutput:
        # Here we assume that the pdf_chunk is a valid PDF file chunk
        if (
            not pdf_chunk.exists()
            or not pdf_chunk.is_file()
            or not pdf_chunk.suffix.lower() == ".pdf"
        ):
            raise ValueError(f"Input document {pdf_chunk} is not a valid PDF file.")

        parameters = {
            "from_formats": ["pdf"],
            "to_formats": ["html"],
            "image_export_mode": "embedded",
            "do_ocr": True,
            "force_ocr": False,
            "ocr_engine": "rapidocr",
            "ocr_lang": ["en", "de"],
            "pdf_backend": "dlparse_v4",
            "table_mode": "accurate",
            "abort_on_error": False,
        }

        files = {
            "files": (pdf_chunk.name, open(pdf_chunk, "rb"), "application/pdf"),
        }

        with httpx.Client(timeout=300) as client:
            response = client.post(
                url=f"{self.url}/v1/convert/file", files=files, data=parameters
            )
            response.raise_for_status()
            result = response.json()

            return DoclingPDF2HTMLOutput(
                html_content=result["document"]["html_content"]
            )
