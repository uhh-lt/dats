import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.user.user_dto import UserRead

from .conftest import FEWSHOT_ID, TRAINED_ID, ZEROSHOT_ID, AssistantUsersDatabase

MIGRATION = (
    Path(__file__).parents[2]
    / "src/migrations/alembic/versions"
    / "0a88c0776a57_virtual_users.py"
)


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_0a88c0776a57", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _virtual_users(client: TestClient, project_id: int) -> dict[str, int]:
    """The virtual users of a project by name."""
    response = client.get(f"/user/{project_id}/user")
    assert response.status_code == 200, response.text
    users = [
        UserRead.model_validate({**data, "password": None}) for data in response.json()
    ]
    return {user.first_name: user.id for user in users if user.is_virtual}


@pytest.fixture(scope="function")
def migrated(
    db_session: Session, assistant_users_database: AssistantUsersDatabase
) -> AssistantUsersDatabase:
    """Run the data part of the migration on the fixture database (the schema is
    already migrated), as alembic does: with the `op` proxy bound to the
    connection of the session."""
    migration = _load_migration()
    context = MigrationContext.configure(db_session.connection())
    with Operations.context(context):
        migration._migrate_assistant_users()
    db_session.commit()
    return assistant_users_database


# ===========================================================================
# MIGRATE ASSISTANT USERS TO VIRTUAL USERS (0a88c0776a57) TESTS
# ===========================================================================


def test_migration_creates_virtual_users_only_where_assistants_have_data(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """Every project gets a virtual user per assistant user that has data in
    it, and no other."""
    assert _virtual_users(client, migrated["project"].id).keys() == {
        "Assistant (zero-shot)",
        "Assistant (few-shot)",
    }
    assert _virtual_users(client, migrated["other_project"].id).keys() == {
        "Assistant (trained)"
    }
    assert _virtual_users(client, migrated["empty_project"].id) == {}


@pytest.mark.parametrize("user_id", [ZEROSHOT_ID, FEWSHOT_ID, TRAINED_ID])
def test_migration_deletes_the_global_assistant_users(
    client: TestClient, migrated: AssistantUsersDatabase, user_id: int
):
    """The global assistant users and their memberships are gone."""
    assert client.get(f"/user/by_id/{user_id}").status_code == 404
    for project_key in ("project", "other_project", "empty_project"):
        project_id = migrated[project_key].id  # type: ignore[literal-required]
        members = client.get(f"/user/{project_id}/user").json()
        assert user_id not in {member["id"] for member in members}


def test_migration_moves_annotations_to_the_virtual_users(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """Annotations keep their ids and belong to the virtual user of their
    assistant in their project."""
    project_virtual_users = _virtual_users(client, migrated["project"].id)
    other_virtual_users = _virtual_users(client, migrated["other_project"].id)
    expected_span_users = {
        **{
            span_id: project_virtual_users["Assistant (zero-shot)"]
            for span_id in migrated["zeroshot_span_ids"]
        },
        migrated["fewshot_span_id"]: project_virtual_users["Assistant (few-shot)"],
        migrated["trained_span_id"]: other_virtual_users["Assistant (trained)"],
        migrated["human_copy_id"]: migrated["user"].id,
    }

    for span_id, expected_user_id in expected_span_users.items():
        response = client.get(f"/span/{span_id}")
        assert response.status_code == 200, response.text
        assert SpanAnnotationRead.model_validate(response.json()).user_id == (
            expected_user_id
        )
    response = client.get(f"/sentence/{migrated['zeroshot_sentence_id']}")
    assert response.status_code == 200, response.text
    assert (
        SentenceAnnotationRead.model_validate(response.json()).user_id
        == (project_virtual_users["Assistant (zero-shot)"])
    )
    annotators = client.get(f"/sdoc/{migrated['sdoc'].id}/annotators").json()
    assert set(annotators) == {
        project_virtual_users["Assistant (zero-shot)"],
        project_virtual_users["Assistant (few-shot)"],
        migrated["user"].id,
    }


def test_migration_remaps_the_provenance_of_copies(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """A human copy of an assistant annotation records the virtual user as
    its source user."""
    zeroshot = _virtual_users(client, migrated["project"].id)["Assistant (zero-shot)"]

    response = client.get(f"/span/{migrated['human_copy_id']}")

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.source_user_id == zeroshot
    assert copy.source_annotation_id == migrated["zeroshot_span_ids"][0]


def test_migration_moves_memos_by_and_about_the_assistant(
    client: TestClient, db_session: Session, migrated: AssistantUsersDatabase
):
    """The memo the assistant wrote belongs to its virtual user; the memo
    about the assistant user is attached to the virtual user."""
    zeroshot = _virtual_users(client, migrated["project"].id)["Assistant (zero-shot)"]

    response = client.get(f"/memo/{migrated['zeroshot_memo_id']}")

    assert response.status_code == 200, response.text
    assert response.json()["user_id"] == zeroshot
    attached_user_id = db_session.execute(
        sa.text(
            "SELECT oh.user_id FROM memo m JOIN objecthandle oh "
            "ON oh.id = m.attached_to_id WHERE m.id = :id"
        ),
        {"id": migrated["memo_about_zeroshot_id"]},
    ).scalar_one()
    assert attached_user_id == zeroshot


def test_migration_remaps_saved_user_filters(
    client: TestClient, db_session: Session, migrated: AssistantUsersDatabase
):
    """Saved timeline analyses and search views that filter on the assistant
    filter on its virtual user; other users in the filter stay."""
    zeroshot = _virtual_users(client, migrated["project"].id)["Assistant (zero-shot)"]

    concepts: list[dict[str, Any]] = db_session.execute(
        sa.text("SELECT concepts FROM timelineanalysis WHERE id = :id"),
        {"id": migrated["timeline_analysis_id"]},
    ).scalar_one()
    filters: dict[str, Any] = db_session.execute(
        sa.text("SELECT filters FROM searchview WHERE id = :id"),
        {"id": migrated["search_view_id"]},
    ).scalar_one()

    assert concepts[0]["filter"]["items"][0]["value"] == [zeroshot, migrated["user"].id]
    assert filters["items"][0]["value"] == zeroshot
