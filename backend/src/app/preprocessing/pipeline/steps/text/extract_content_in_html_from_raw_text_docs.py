from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

repo = RepoService()


def extract_content_in_html_from_raw_text_docs(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    if pptd.mime_type not in ["text/html", "text/plain"]:
        return cargo

    content = pptd.filepath.read_text(encoding="utf-8")
    if pptd.mime_type == "text/plain":
        content_as_html = f"<html><body><p>{content}</p></body></html>"
    elif pptd.mime_type == "text/html":
        content_as_html = content
    else:
        # this should never happen
        raise ValueError(f"Unknown mime_type: {pptd.mime_type}")

    pptd.html = content_as_html

    return cargo
