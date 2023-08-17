from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

repo = RepoService()


def create_html_content_file(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    # create a html file with the textual content
    html_filepath = pptd.filepath.with_suffix(".html")
    with open(html_filepath, "w") as html_file:
        html_file.write(pptd.html)

    logger.debug(f"Created HTML file with content from {pptd.filename}!")

    pptd.html_filepath = html_filepath

    return cargo
