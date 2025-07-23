from loguru import logger
from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from repos.filesystem_repo import RepoService

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
    logger.info(
        f"Adding additional parameters to the create PPID with {additional_parameters}"
    )
    logger.info(f"filename: {cargo.ppj_payload.filename}, filepath {filepath}")
    ppid = PreProImageDoc(
        filename=cargo.ppj_payload.filename,
        project_id=cargo.ppj_payload.project_id,
        mime_type=cargo.ppj_payload.mime_type,
        filepath=filepath,
        **additional_parameters,
    )

    if "bboxes" in cargo.data:
        for bbox in cargo.data["bboxes"]:
            if bbox.code not in ppid.bboxes:
                ppid.bboxes[bbox.code] = set()
            ppid.bboxes[bbox.code].add(bbox)
        logger.info(f"Adding bbox {ppid.bboxes}")

    cargo.data["ppid"] = ppid

    return cargo
