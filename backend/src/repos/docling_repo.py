import time
from pathlib import Path

import httpx
from loguru import logger
from pydantic import BaseModel, Field

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class DoclingPDF2HTMLOutput(BaseModel):
    html_content: str = Field(
        description="The HTML content of the converted PDF document.",
        examples=["<html><body><h1>Converted PDF</h1></body></html>"],
    )


class DoclingRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize DoclingRepo. DO NOT connect here - call connect() explicitly.
        """
        RepoBase.__init__(self)
        self._url: str | None = None

    def connect(self) -> None:
        """Establish connection to Docling."""
        if self._url is not None:
            logger.debug("DoclingRepo already connected, skipping")
            return

        try:
            url = f"http://{conf.docling.host}:{conf.docling.port}"

            # test connection to docling
            with httpx.Client(timeout=10) as client:
                resp = client.get(url + "/health")
                resp.raise_for_status()

            self._url = url
            logger.info("Successfully connected to Docling!")

        except Exception as e:
            msg = f"Cannot instantiate DoclingRepo - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """
        Close the connection to Docling.
        This does nothing as Docling is stateless.
        """
        if self._url is None:
            logger.debug("DoclingRepo already closed, skipping")
            return

        logger.info("Closing connection to Docling...")
        self._url = None

    def remove_data(self) -> None:
        """
        Reset/clear Docling data.
        This does nothing as Docling is stateless.
        """
        logger.info("Docling reset (no state to clear)")

    def pdf2html(self, pdf_chunk: Path) -> DoclingPDF2HTMLOutput:
        # Here we assume that the pdf_chunk is a valid PDF file chunk
        if self._url is None:
            raise RuntimeError("DoclingRepo is not connected. Call connect() first.")

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

        # 1. submit task
        with httpx.Client(timeout=300) as client:
            response = client.post(
                url=f"{self._url}/v1/convert/file/async", files=files, data=parameters
            )
            response.raise_for_status()
            task = response.json()

        # 2. poll for result
        with httpx.Client(timeout=300) as client:
            while task["task_status"] not in ["success", "failure"]:
                response = client.get(
                    url=f"{self._url}/v1/status/poll/{task['task_id']}"
                )
                response.raise_for_status()
                task = response.json()
                time.sleep(5)

        # 3. fetch result
        if task["task_status"] == "failure":
            raise ValueError("Docling conversion failed!")

        with httpx.Client(timeout=300) as client:
            response = client.get(url=f"{self._url}/v1/result/{task['task_id']}")
            response.raise_for_status()
            result = response.json()

            return DoclingPDF2HTMLOutput(
                html_content=result["document"]["html_content"]
            )
