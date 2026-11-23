import shutil
from pathlib import Path
from typing import TYPE_CHECKING

from loguru import logger

from repos.filesystem.filesystem_exceptions import FileAlreadyExistsError
from repos.filesystem.filesystem_repo import FilesystemRepo
from utils.import_utils import import_by_suffix

if TYPE_CHECKING:
    from common.crud_enum import Crud

_file_cruds: list[type["FileCRUDBase"]] = []
_file_cruds_imported = False


class FileCRUDBase:
    """
    The files of one kind, in one folder per entity:
    `projects/<project_id>/<folder>/<id>/<name>`.

    A subclass names its `folder` and the `entity` whose id names the subfolder
    (None if the files belong to no database row, e.g. the exports), and
    registers itself, so that deleting an entity deletes its files in every
    file CRUD (`delete_by_entity`).
    """

    folder: str
    entity: "Crud | None"

    def __init_subclass__(cls, **kwargs) -> None:
        super().__init_subclass__(**kwargs)
        _file_cruds.append(cls)

    @staticmethod
    def all_file_cruds() -> list[type["FileCRUDBase"]]:
        """All file CRUDs of DATS. Imports every `*_file_crud.py` module once, so
        that core never has to import the module file CRUDs."""
        global _file_cruds_imported
        if not _file_cruds_imported:
            import_by_suffix("_file_crud.py")
            _file_cruds_imported = True
        return list(_file_cruds)

    @staticmethod
    def delete_by_entity(entity: "Crud", *, project_id: int, ids: list[int]) -> None:
        """Deletes the folders of the given entities in every file CRUD whose
        entity is `entity`."""
        for file_crud in FileCRUDBase.all_file_cruds():
            if file_crud.entity is not entity:
                continue
            for id in ids:
                file_crud().delete(project_id=project_id, id=id)

    ### READ OPERATIONS ###

    def dir(self, *, project_id: int, id: int | str) -> Path:
        """The folder of the entity's files."""
        return FilesystemRepo().project_dir(project_id) / self.folder / str(id)

    def path(self, *, project_id: int, id: int | str, name: str) -> Path:
        """The path of the entity's file `name`, whether it exists or not."""
        return self.dir(project_id=project_id, id=id) / name

    def exists(
        self, *, project_id: int, id: int | str, name: str | None = None
    ) -> bool:
        """Whether the entity's file `name` exists, or without a name, whether
        the entity has a folder."""
        if name is None:
            return self.dir(project_id=project_id, id=id).is_dir()
        return self.path(project_id=project_id, id=id, name=name).exists()

    def url(self, *, project_id: int, id: int | str, name: str) -> str:
        """The URL of the entity's file `name` relative to the content server,
        e.g. `projects/1/thumbnails/42/thumbnail.webp`."""
        return str(
            self.path(project_id=project_id, id=id, name=name).relative_to(
                FilesystemRepo().root_dir
            )
        )

    def ids(self, *, project_id: int) -> list[str]:
        """The ids of the entities of the project that have a folder."""
        root = FilesystemRepo().project_dir(project_id) / self.folder
        if not root.is_dir():
            return []
        return sorted(p.name for p in root.iterdir() if p.is_dir())

    ### WRITE OPERATIONS ###

    def write(self, *, project_id: int, id: int | str, name: str, data: bytes) -> Path:
        """Writes the entity's file `name`, replacing an existing one."""
        path = self.path(project_id=project_id, id=id, name=name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def move_in(
        self, *, project_id: int, id: int | str, src: Path, name: str | None = None
    ) -> Path:
        """Moves the file or folder `src` into the entity's folder, as `name`
        (default: its own name). Raises FileAlreadyExistsError if it exists."""
        dst = self.path(project_id=project_id, id=id, name=name or src.name)
        if dst.exists():
            raise FileAlreadyExistsError(
                name=self.url(project_id=project_id, id=id, name=dst.name)
            )
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(src, dst)
        return dst

    ### DELETE OPERATIONS ###

    def delete(self, *, project_id: int, id: int | str) -> None:
        """Removes the entity's folder with all of its files (if it exists)."""
        folder = self.dir(project_id=project_id, id=id)
        if not folder.exists():
            return
        logger.info(f"Removing {folder.relative_to(FilesystemRepo().root_dir)}")
        shutil.rmtree(folder)
