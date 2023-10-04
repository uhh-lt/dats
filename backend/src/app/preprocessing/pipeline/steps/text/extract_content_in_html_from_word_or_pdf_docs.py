import os
from functools import lru_cache

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from loguru import logger

# TODO Flo: Do we want this in the config ?
TIKA_SUPPORTED_FILE_EXTENSIONS = [".docx", ".doc", ".pdf"]


@lru_cache(maxsize=1)
def __start_apache_tika_server(foo: str) -> None:
    from tika import parser

    logger.info("Starting Apache Tika Server...")
    # start by parsing a random text file (hacky, I know...)
    tika_starter_dummy = "/tmp/tika_starter_dummy.txt"
    with open(tika_starter_dummy, "w") as f:
        f.write("tika_starter_dummy")
    parser.from_file(tika_starter_dummy)
    os.remove(tika_starter_dummy)
    logger.info("Starting Apache Tika Server... Done!")
    return None


repo = RepoService()


def extract_content_in_html_from_word_or_pdf_docs(
    cargo: PipelineCargo,
) -> PipelineCargo:
    __start_apache_tika_server(foo="bar")
    from tika import parser

    pptd: PreProTextDoc = cargo.data["pptd"]
    filepath = pptd.filepath

    if filepath.suffix not in TIKA_SUPPORTED_FILE_EXTENSIONS:
        return cargo

    logger.debug(f"Extracting content as HTML via Tika from {filepath.name} for ...")

    parsed = parser.from_file(filename=str(filepath), xmlContent=True)

    if int(parsed["status"]) != 200 or parsed["content"] is None:
        logger.warning(f"Couldn't get content via Tika from {filepath}!")
        pptd.html = ""
    else:
        pptd.html = parsed["content"].strip()

    return cargo
