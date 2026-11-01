import pandas as pd
import pytest
from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.user.user_crud import crud_user
from modules.eximport.import_exceptions import ImportUsersError
from modules.eximport.span_annotations.export_span_annotations import (
    export_selected_span_annotations,
)
from modules.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from modules.eximport.user.export_users import export_all_users
from modules.eximport.user.import_users import import_users_to_proj
from repos.filesystem_repo import FilesystemRepo
from virtual_user_test_utils import VirtualUserProject

# ===========================================================================
# EXPORT / IMPORT OF VIRTUAL USERS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export and import functions of the jobs directly. Virtual users are exported
# and imported by email like all users.


def test_export_users_lists_virtual_users_with_email(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """The users export lists the members and the virtual users by email and
    marks the virtual users."""
    project = virtual_user_project["project"]
    run1, run2 = virtual_user_project["run1"], virtual_user_project["run2"]

    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)

    df = pd.read_csv(path)
    assert dict(zip(df["email"], df["is_virtual"])) == {
        **{member.email: False for member in project.users},
        run1.email: True,
        run2.email: True,
    }


def test_import_users_creates_missing_virtual_users(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """A virtual user that does not exist (e.g. in another DATS instance) is
    created in the project with its email and name; importing again creates no
    duplicates."""
    project = virtual_user_project["project"]
    run2 = virtual_user_project["run2"]
    run2_email = run2.email
    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)
    crud_user.delete(db=db_session, id=run2.id)
    db_session.commit()

    for _ in range(2):
        import_users_to_proj(db=db_session, df=pd.read_csv(path), project_id=project.id)
        db_session.commit()

    created = crud_user.read_by_email(db=db_session, email=run2_email)
    assert (created.project_id, created.first_name) == (project.id, "ExperimentA-Run2")


def test_import_users_rejects_virtual_users_of_another_project(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """A virtual user belongs to one project, so it cannot be imported into
    another project of the same DATS instance."""
    project = virtual_user_project["project"]
    other_project = virtual_user_project["other_project"]
    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)

    with pytest.raises(ImportUsersError, match="belongs to another project"):
        import_users_to_proj(
            db=db_session, df=pd.read_csv(path), project_id=other_project.id
        )


@pytest.mark.parametrize(
    "email,is_virtual,expected_error",
    [
        # an unknown user is reported, not created
        pytest.param("nobody@dats.org", False, "not found", id="unknown-user"),
        # a virtual user with a person's email would claim that email
        pytest.param("person@dats.org", True, "virtual.dats domain", id="claim-email"),
    ],
)
def test_import_users_rejects_invalid_users(
    db_session: Session,
    virtual_user_project: VirtualUserProject,
    email: str,
    is_virtual: bool,
    expected_error: str,
) -> None:
    """Invalid user rows are collected into an ImportUsersError."""
    project = virtual_user_project["project"]
    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)
    df = pd.read_csv(path)
    df.loc[len(df)] = {**df.iloc[0].to_dict(), "email": email, "is_virtual": is_virtual}

    with pytest.raises(ImportUsersError, match=expected_error):
        import_users_to_proj(db=db_session, df=df, project_id=project.id)


def test_import_users_does_not_make_virtual_users_members(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """A row of a virtual user that is not marked as virtual is rejected instead
    of adding the virtual user as a project member."""
    project = virtual_user_project["project"]
    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)
    df = pd.read_csv(path)
    df["is_virtual"] = False

    with pytest.raises(ImportUsersError, match="is a virtual user"):
        import_users_to_proj(db=db_session, df=df, project_id=project.id)


def test_span_annotations_of_virtual_user_survive_export_import(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """Annotations of a virtual user are exported with its email and imported
    into it again; the provenance of a copy points to it."""
    project = virtual_user_project["project"]
    run1, user = virtual_user_project["run1"], virtual_user_project["user"]
    span_ids = [
        virtual_user_project["run1_alpha"].id,
        virtual_user_project["run1_delta"].id,
        virtual_user_project["user_alpha_copy"].id,
    ]
    path = export_selected_span_annotations(
        db=db_session,
        fsr=FilesystemRepo(),
        project_id=project.id,
        span_annotation_ids=span_ids,
    )
    df = pd.read_csv(path)
    assert set(df["user_email"]) == {run1.email, user.email}
    # the import refuses annotations whose uuid exists in the project
    df["uuid"] = [f"imported-{uuid}" for uuid in df["uuid"]]
    df["source_annotation_uuid"] = df["source_annotation_uuid"].map(
        lambda uuid: f"imported-{uuid}" if isinstance(uuid, str) else uuid
    )

    imported_ids = import_span_annotations_to_proj(
        db=db_session, df=df, project_id=project.id
    )
    db_session.commit()

    imported = crud_span_anno.read_by_ids(db=db_session, ids=imported_ids)
    owners = sorted((span.text, span.user_id) for span in imported)
    assert owners == sorted(
        [("Alpha", run1.id), ("Delta", run1.id), ("Alpha", user.id)]
    )
    copy = next(span for span in imported if span.user_id == user.id)
    assert copy.source_user_id == run1.id
