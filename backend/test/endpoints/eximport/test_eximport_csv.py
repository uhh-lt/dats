from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from modules.eximport.codes.export_codes import export_all_codes
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from repos.filesystem_repo import FilesystemRepo

from .conftest import MissingValueNamedCodes

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
