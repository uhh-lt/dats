from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

repo = RepoService()


def create_ppad(cargo: PipelineCargo) -> PipelineCargo:
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
    if "word_level_transcriptions" in cargo.data:
        additional_parameters["word_level_transcriptions"] = cargo.data[
            "word_level_transcriptions"
        ]
    logger.info(
        f"Adding additional parameters to the create PPAD with {additional_parameters}"
    )

    ppad = PreProAudioDoc(
        project_id=cargo.ppj_payload.project_id,
        filename=cargo.ppj_payload.filename,
        mime_type=cargo.ppj_payload.mime_type,
        filepath=filepath,
        **additional_parameters,
    )
    cargo.data["ppad"] = ppad

    return cargo
