import shutil
from pathlib import Path

from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class FilesystemRepo(RepoBase, metaclass=SingletonMeta):
    """The root folder of the DATS files and the folders of the projects in it.
    The files themselves are read and written by the file CRUDs
    (`FileCRUDBase`, `crud_temporary_file`)."""

    def __init__(self) -> None:
        RepoBase.__init__(self)
        self.root_dir: Path = conf.filesystem.root_directory

    def connect(self) -> None:
        self.root_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Using root directory '{self.root_dir}' for DATS Filesystem!")

    def close_connection(self) -> None:
        pass

    def remove_data(self) -> None:
        """Removes all files and folders below the root folder."""
        if not self.root_dir.exists():
            return
        logger.warning(f"Removing DATS Filesystem at {self.root_dir}")
        for path in self.root_dir.iterdir():
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()

    def projects_dir(self) -> Path:
        return self.root_dir / "projects"

    def project_dir(self, project_id: int) -> Path:
        return self.projects_dir() / str(project_id)

    def project_ids(self) -> list[int]:
        """The ids of the projects that have a folder."""
        if not self.projects_dir().exists():
            return []
        return sorted(
            int(p.name) for p in self.projects_dir().iterdir() if p.name.isdigit()
        )

    def delete_project(self, project_id: int) -> None:
        """Removes the folder of the project with all of its files."""
        logger.info(f"Removing all files of project {project_id}")
        shutil.rmtree(self.project_dir(project_id), ignore_errors=True)
