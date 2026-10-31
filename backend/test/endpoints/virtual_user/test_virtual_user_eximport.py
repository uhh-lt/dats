import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.user.user_crud import crud_user
from modules.eximport.span_annotations.export_span_annotations import (
    export_selected_span_annotations,
)
from modules.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from modules.eximport.user.export_users import export_all_users
from modules.eximport.user.import_users import import_users_to_proj
from repos.filesystem_repo import FilesystemRepo

from .conftest import VirtualUserProject

# ===========================================================================
# EXPORT / IMPORT OF VIRTUAL USERS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export and import functions of the jobs directly. Virtual users have no
# email: exports reference them by 'virtual:<name>' (names are unique per project).


def _virtual_user_names(client: TestClient, project_id: int) -> dict[str, int]:
    response = client.get(f"/user/{project_id}/user")
    assert response.status_code == 200, response.text
    return {u["first_name"]: u["id"] for u in response.json() if u["is_virtual"]}


def test_export_users_lists_virtual_users_by_name(
    db_session: Session, virtual_user_project: VirtualUserProject
) -> None:
    """The users export lists the members by email and the virtual users by
    'virtual:<name>'."""
    project = virtual_user_project["project"]

    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)

    emails = pd.read_csv(path)["email"].tolist()
    assert virtual_user_project["user"].email in emails
    assert emails[-2:] == ["virtual:ExperimentA-Run1", "virtual:ExperimentA-Run2"]


def test_import_users_creates_the_virtual_users(
    client: TestClient,
    db_session: Session,
    virtual_user_project: VirtualUserProject,
) -> None:
    """Importing the users export into another project creates its virtual
    users there; importing it again creates no duplicates."""
    project = virtual_user_project["project"]
    target = virtual_user_project["target_project"]
    path = export_all_users(db=db_session, fsr=FilesystemRepo(), project_id=project.id)

    for _ in range(2):
        import_users_to_proj(db=db_session, df=pd.read_csv(path), project_id=target.id)
        db_session.commit()

    assert _virtual_user_names(client, target.id).keys() == {
        "ExperimentA-Run1",
        "ExperimentA-Run2",
    }


def test_span_annotations_of_virtual_user_survive_export_import(
    client: TestClient,
    db_session: Session,
    virtual_user_project: VirtualUserProject,
) -> None:
    """Annotations of a virtual user are imported into the virtual user
    of the same name, which the import creates; the provenance of a human copy
    points to it."""
    project = virtual_user_project["project"]
    target = virtual_user_project["target_project"]
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
    assert set(df["user_email"]) == {
        "virtual:ExperimentA-Run1",
        virtual_user_project["user"].email,
    }
    # the import refuses annotations whose uuid exists in the target project
    df["uuid"] = [f"imported-{uuid}" for uuid in df["uuid"]]
    df["source_annotation_uuid"] = df["source_annotation_uuid"].map(
        lambda uuid: f"imported-{uuid}" if isinstance(uuid, str) else uuid
    )

    imported_ids = import_span_annotations_to_proj(
        db=db_session, df=df, project_id=target.id
    )
    db_session.commit()

    run1 = _virtual_user_names(client, target.id)["ExperimentA-Run1"]
    assert crud_user.read(db=db_session, id=run1).is_virtual
    imported = crud_span_anno.read_by_ids(db=db_session, ids=imported_ids)
    owners = sorted((span.text, span.user_id) for span in imported)
    assert owners == sorted(
        [
            ("Alpha", run1),
            ("Delta", run1),
            ("Alpha", virtual_user_project["user"].id),
        ]
    )
    copy = next(
        span for span in imported if span.user_id == virtual_user_project["user"].id
    )
    assert copy.source_user_id == run1
