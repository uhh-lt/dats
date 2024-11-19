from pathlib import Path

from ray_config import conf

SHARED_REPO_ROOT: Path = Path(conf.repo_root)


def get_project_repo_root_path(proj_id: int) -> Path:
    return SHARED_REPO_ROOT.joinpath(f"projects/{proj_id}/")


def get_sdoc_path_for_project_and_sdoc_name(
    proj_id: int, sdoc_name: str | Path
) -> Path:
    return get_project_repo_root_path(proj_id).joinpath("docs").joinpath(sdoc_name)
