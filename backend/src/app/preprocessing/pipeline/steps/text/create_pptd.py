from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc

repo = RepoService()


def create_pptd(cargo: PipelineCargo) -> PipelineCargo:
    logger.info("create pptd")
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
    pptd = PreProTextDoc(
        filename=cargo.ppj_payload.filename,
        project_id=cargo.ppj_payload.project_id,
        mime_type=cargo.ppj_payload.mime_type,
        filepath=filepath,
        **additional_parameters,
    )
    if "annotations" in cargo.data:
        for auto in cargo.data["annotations"]:
            if auto.code not in pptd.spans:
                pptd.spans[auto.code] = list()
            pptd.spans[auto.code].append(auto)

    cargo.data["pptd"] = pptd

    return cargo
