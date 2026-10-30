from collections.abc import Callable
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.metadata.project_metadata_crud import crud_project_meta
from core.tag.tag_crud import crud_tag
from core.user.user_orm import UserORM
from modules.eximport.codes.export_codes import export_all_codes
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from modules.eximport.project_metadata.export_project_metadata import (
    export_all_project_metadatas,
)
from modules.eximport.tags.export_tags import export_all_tags
from repos.filesystem_repo import FilesystemRepo

from .conftest import EmptyDescriptionProjects, MissingValueNamedCodes

# ===========================================================================
# EXPORT / IMPORT CSV FILES (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export functions and the import job handler directly.


def test_codes_named_like_missing_values_survive_export_import_round_trip(
    db_session: Session, missing_value_named_codes: MissingValueNamedCodes
) -> None:
    """Exporting the codes "NA" (description "N/A") and "null" (child of "NA") and
    importing the CSV into another project keeps their names, parent and
    descriptions as strings, while the empty parent cell of "NA" stays None."""
    project = missing_value_named_codes["project"]
    target_project = missing_value_named_codes["target_project"]

    path = export_all_codes(db=db_session, fsr=FilesystemRepo(), project_id=project.id)
    ImportService().handle_import_job(
        db=db_session,
        payload=ImportJobInput(
            project_id=target_project.id,
            import_job_type=ImportJobType.CODES,
            user_id=project.users[0].id,
            file_name=path.name,
        ),
    )
    db_session.commit()

    na_code = crud_code.read_by_name_and_project(
        db=db_session, code_name="NA", project_id=target_project.id
    )
    null_code = crud_code.read_by_name_and_project(
        db=db_session, code_name="null", project_id=target_project.id
    )
    assert na_code is not None
    assert null_code is not None
    assert (na_code.description, na_code.parent_id) == ("N/A", None)
    assert (null_code.description, null_code.parent_id) == ("null", na_code.id)


def _read_code_description(db: Session, project_id: int) -> str | None:
    code = crud_code.read_by_name_and_project(
        db=db, code_name="Undescribed code", project_id=project_id
    )
    return code.description if code is not None else None


def _read_tag_description(db: Session, project_id: int) -> str | None:
    tag = crud_tag.read_by_name_and_project(
        db=db, name="Undescribed tag", project_id=project_id
    )
    return tag.description if tag is not None else None


def _read_metadata_description(db: Session, project_id: int) -> str | None:
    fields = crud_project_meta.read_by_project_and_key(
        db=db, project_id=project_id, key="undescribed"
    )
    return fields[0].description if fields else None


@pytest.mark.parametrize(
    "export,import_job_type,read_description",
    [
        # A code without description.
        pytest.param(
            export_all_codes,
            ImportJobType.CODES,
            _read_code_description,
            id="code",
        ),
        # A tag without description.
        pytest.param(
            export_all_tags, ImportJobType.TAGS, _read_tag_description, id="tag"
        ),
        # A project metadata field without description.
        pytest.param(
            export_all_project_metadatas,
            ImportJobType.PROJECT_METADATA,
            _read_metadata_description,
            id="project-metadata",
        ),
    ],
)
def test_objects_without_description_survive_export_import_round_trip(
    db_session: Session,
    empty_description_projects: EmptyDescriptionProjects,
    test_user: UserORM,
    export: Callable[..., Path],
    import_job_type: ImportJobType,
    read_description: Callable[[Session, int], str | None],
) -> None:
    """Exporting an object with an empty description and importing the CSV into
    another project creates it with an empty description instead of failing the
    import on the empty cell."""
    project = empty_description_projects["project"]
    target_project = empty_description_projects["target_project"]

    path = export(db=db_session, fsr=FilesystemRepo(), project_id=project.id)
    ImportService().handle_import_job(
        db=db_session,
        payload=ImportJobInput(
            project_id=target_project.id,
            import_job_type=import_job_type,
            user_id=test_user.id,
            file_name=path.name,
        ),
    )
    db_session.commit()

    assert read_description(db_session, target_project.id) == ""
