import logging
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Request
from ray import serve
from ray.serve.handle import DeploymentHandle

from config import build_ray_api_deployment_config, conf
from dto.docling import DoclingPDF2HTMLOutput
from models.docling import DoclingModel
from utils import write_bytes_to_file

api = FastAPI()

logger = logging.getLogger("ray.serve")


cc = conf.docling

TMP_DIR = Path(cc.tmp_dir)


@serve.deployment(**build_ray_api_deployment_config("docling"))
@serve.ingress(api)
class DoclingApi:
    def __init__(self, docling_model_handle: DeploymentHandle) -> None:
        self.docling = docling_model_handle

    @api.post(
        "/pdf2html",
        response_model=DoclingPDF2HTMLOutput,
    )
    async def pdf2html(self, request: Request) -> DoclingPDF2HTMLOutput:
        # we are expecting a PDF file as binary data (application/octet-stream)
        raw_pdf_bytes = await request.body()
        # generate a random filename and store the PDF in the tmp dir
        fn = TMP_DIR / f"{uuid4()}.pdf"
        pdf_fn = write_bytes_to_file(raw_pdf_bytes, fn)
        transcript_result = await self.docling.pdf2html.remote(pdf_fn)  # type: ignore
        return transcript_result


app = DoclingApi.bind(
    docling_model_handle=DoclingModel.bind(),
)
