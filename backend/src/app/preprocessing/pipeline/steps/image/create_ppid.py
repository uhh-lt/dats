from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

repo = RepoService()


def create_ppid(cargo: PipelineCargo) -> PipelineCargo:
    filepath = repo._get_dst_path_for_project_sdoc_file(
        proj_id=cargo.ppj_payload.project_id, filename=cargo.ppj_payload.filename
    )
    if not filepath.exists():
        raise FileNotFoundError(f"File {filepath} not found in repository!")

    additional_parameters = dict()
    if "metadata" in cargo.data:
        additional_parameters["metadata"] = cargo.data["metadata"]
    if "sdoc_link" in cargo.data:
        additional_parameters["sdoc_link_create_dtos"] = cargo.data["sdoc_link"]
    if "tags" in cargo.data:
        additional_parameters["tags"] = cargo.data["tags"]
    if "bboxes" in cargo.data:
        additional_parameters["bboxes"] = cargo.data["bboxes"]

    ppid = PreProImageDoc(
        filename=cargo.ppj_payload.filename,
        project_id=cargo.ppj_payload.project_id,
        mime_type=cargo.ppj_payload.mime_type,
        filepath=filepath,
        **additional_parameters,
    )

    cargo.data["ppid"] = ppid

    return cargo
