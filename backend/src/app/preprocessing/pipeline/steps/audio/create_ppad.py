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

    ppad = PreProAudioDoc(
        project_id=cargo.ppj_payload.project_id,
        filename=cargo.ppj_payload.filename,
        mime_type=cargo.ppj_payload.mime_type,
        filepath=filepath,
    )
    cargo.data["ppad"] = ppad

    return cargo
