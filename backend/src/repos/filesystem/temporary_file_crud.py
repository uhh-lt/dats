import shutil
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from loguru import logger

from config import conf
from repos.filesystem.filesystem_exceptions import UploadTooLargeError
from repos.filesystem.filesystem_repo import FilesystemRepo


class CRUDTemporaryFile:
    """
    Temporary files, in one folder per owner: `temporary_files/<id>/`.

    Either scratch inside one job (`folder()`, deleted at its end), or a
    handover through a job payload (`create()`, the id travels in the payload),
    which the consuming job deletes when it is done. Folders older than
    `filesystem.temporary_ttl` are deleted at start-up (`delete_older_than`).
    """

    ### CREATE OPERATIONS ###

    def create(self) -> str:
        """Creates an empty temporary folder and returns its id."""
        id = str(uuid4())
        self.dir(id=id).mkdir(parents=True)
        return id

    @contextmanager
    def folder(self) -> Iterator[Path]:
        """A scratch folder, deleted at exit, also on failure."""
        id = self.create()
        try:
            yield self.dir(id=id)
        finally:
            self.delete(id=id)

    ### READ OPERATIONS ###

    def dir(self, *, id: str) -> Path:
        return FilesystemRepo().root_dir / "temporary_files" / id

    def path(self, *, id: str, name: str) -> Path:
        return self.dir(id=id) / name

    ### WRITE OPERATIONS ###

    def write(self, *, id: str, name: str, data: bytes) -> Path:
        path = self.path(id=id, name=name)
        path.write_bytes(data)
        return path

    def store_upload(self, *, id: str, upload: UploadFile, name: str) -> Path:
        """Stores the uploaded file as `name`. Raises UploadTooLargeError if it
        is larger than `api.max_upload_file_size`."""
        max_size = conf.api.max_upload_file_size
        path = self.path(id=id, name=name)
        size = 0
        with open(path, "wb") as f:
            for chunk in upload.file:
                size += len(chunk)
                if size > max_size:
                    raise UploadTooLargeError(filename=name, max_size=max_size)
                f.write(chunk)
        return path

    ### DELETE OPERATIONS ###

    def delete(self, *, id: str) -> None:
        shutil.rmtree(self.dir(id=id), ignore_errors=True)

    def delete_if_empty(self, *, id: str) -> None:
        """Deletes the temporary folder once all its files are moved out (the
        last consumer of a handover removes it)."""
        try:
            self.dir(id=id).rmdir()
        except OSError:
            # not empty (another consumer still has a file in it) or gone
            pass

    def delete_older_than(self, *, age: timedelta) -> None:
        """Deletes the temporary folders that were last changed longer than
        `age` ago."""
        root = FilesystemRepo().root_dir / "temporary_files"
        if not root.is_dir():
            return
        oldest = time.time() - age.total_seconds()
        expired = [p for p in root.iterdir() if p.stat().st_mtime < oldest]
        for path in expired:
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            else:
                path.unlink(missing_ok=True)
        logger.info(f"Deleted {len(expired)} temporary files older than {age}")


crud_temporary_file = CRUDTemporaryFile()
