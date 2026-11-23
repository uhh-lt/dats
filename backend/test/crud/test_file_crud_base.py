"""Contract of the file store: the folder layout of the file CRUDs, the
deletion by entity, the temporary files and the expiry at start-up."""

import os
import time
from datetime import timedelta

import pytest

import bootstrap
from common.crud_enum import Crud
from core.doc.source_document_file_crud import crud_sdoc_file
from core.project.export_file_crud import EXPORT_TTL, crud_export_file
from core.project.project_orm import ProjectORM
from repos.filesystem.file_crud_base import FileCRUDBase
from repos.filesystem.filesystem_exceptions import FileAlreadyExistsError
from repos.filesystem.filesystem_repo import FilesystemRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file


def _age(path: os.PathLike, seconds: float) -> None:
    """Set the modification time of the path to `seconds` ago."""
    then = time.time() - seconds
    os.utime(path, (then, then))


# ===========================================================================
# FILE CRUDS
# ===========================================================================


def test_every_file_crud_stores_its_files_in_one_folder_per_entity(
    test_project: ProjectORM,
):
    """A file lies at `projects/<project_id>/<folder>/<id>/<name>`, and its URL
    is that path relative to the root folder."""
    for file_crud in FileCRUDBase.all_file_cruds():
        crud = file_crud()
        path = crud.write(project_id=test_project.id, id=7, name="a.txt", data=b"a")

        relative = f"projects/{test_project.id}/{crud.folder}/7/a.txt"
        assert path == FilesystemRepo().root_dir / relative
        assert crud.url(project_id=test_project.id, id=7, name="a.txt") == relative
        assert crud.ids(project_id=test_project.id) == ["7"]


def test_delete_by_entity_deletes_the_folders_of_the_entity_in_every_file_crud(
    test_project: ProjectORM,
):
    """Deleting source documents removes their folders in every file CRUD of
    source documents, and leaves other documents and other entities alone."""
    by_entity = {
        file_crud: file_crud().write(
            project_id=test_project.id, id=1, name="f", data=b"f"
        )
        for file_crud in FileCRUDBase.all_file_cruds()
    }
    other_document = crud_sdoc_file.write(
        project_id=test_project.id, id=2, name="f", data=b"f"
    )

    FileCRUDBase.delete_by_entity(
        Crud.SOURCE_DOCUMENT, project_id=test_project.id, ids=[1]
    )

    assert {
        file_crud.folder: path.exists() for file_crud, path in by_entity.items()
    } == {
        file_crud.folder: file_crud.entity is not Crud.SOURCE_DOCUMENT
        for file_crud in by_entity
    }
    assert other_document.exists()


def test_move_in_refuses_to_replace_a_file(test_project: ProjectORM):
    """A file moved in under the name of an existing file is refused."""
    crud = crud_export_file
    crud.write(project_id=test_project.id, id="e", name="a.csv", data=b"old")
    src = crud_temporary_file.write(
        id=crud_temporary_file.create(), name="a.csv", data=b"new"
    )

    with pytest.raises(FileAlreadyExistsError):
        crud.move_in(project_id=test_project.id, id="e", src=src)

    assert crud.path(project_id=test_project.id, id="e", name="a.csv").read_bytes() == (
        b"old"
    )


# ===========================================================================
# TEMPORARY FILES
# ===========================================================================


def test_temporary_folder_is_deleted_at_exit_also_on_failure():
    """The scratch folder of `folder()` is removed when the block ends, also
    when it raises."""
    folders = []
    with pytest.raises(RuntimeError):
        with crud_temporary_file.folder() as scratch:
            folders.append(scratch)
            (scratch / "f").write_bytes(b"f")
            raise RuntimeError("failed")

    assert [folder.exists() for folder in folders] == [False]


def test_delete_if_empty_keeps_a_folder_with_files():
    """A handover folder is removed only once all its files are moved out."""
    id = crud_temporary_file.create()
    crud_temporary_file.write(id=id, name="f", data=b"f")

    crud_temporary_file.delete_if_empty(id=id)
    assert crud_temporary_file.dir(id=id).exists()

    crud_temporary_file.path(id=id, name="f").unlink()
    crud_temporary_file.delete_if_empty(id=id)
    assert not crud_temporary_file.dir(id=id).exists()


# ===========================================================================
# EXPIRY (bootstrap.delete_expired_files, run at start-up)
# ===========================================================================


def test_start_up_deletes_old_temporary_files_and_expired_exports(
    test_project: ProjectORM,
):
    """At start-up, temporary folders older than `filesystem.temporary_ttl` and
    exports older than the result of the export job are deleted; newer ones
    stay."""
    old_temporary, new_temporary = (
        crud_temporary_file.create(),
        crud_temporary_file.create(),
    )
    _age(crud_temporary_file.dir(id=old_temporary), timedelta(days=2).total_seconds())
    for id in ("old", "new"):
        crud_export_file.write(
            project_id=test_project.id, id=id, name="e.csv", data=b"e"
        )
    _age(crud_export_file.dir(project_id=test_project.id, id="old"), EXPORT_TTL + 60)

    bootstrap.delete_expired_files()

    assert not crud_temporary_file.dir(id=old_temporary).exists()
    assert crud_temporary_file.dir(id=new_temporary).exists()
    assert crud_export_file.ids(project_id=test_project.id) == ["new"]


def test_writing_an_export_deletes_the_expired_exports_of_the_project(
    test_project: ProjectORM,
):
    """A new export deletes the project's exports older than the result of the
    export job."""
    crud_export_file.write(
        project_id=test_project.id, id="old", name="e.csv", data=b"e"
    )
    _age(crud_export_file.dir(project_id=test_project.id, id="old"), EXPORT_TTL + 60)

    crud_export_file.write(
        project_id=test_project.id, id="new", name="e.csv", data=b"e"
    )

    assert crud_export_file.ids(project_id=test_project.id) == ["new"]
