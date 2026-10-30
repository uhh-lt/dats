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
from core.user.user_enum import UserKind

from .conftest import FEWSHOT_ID, TRAINED_ID, ZEROSHOT_ID, AssistantUsersDatabase

MIGRATION = (
    Path(__file__).parents[2]
    / "src/migrations/alembic/versions"
    / "5aba4c95cf5f_migrate_assistant_users_to_virtual_.py"
)


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_5aba4c95cf5f", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _virtual_annotators(client: TestClient, project_id: int) -> dict[str, int]:
    """The virtual annotators of a project by name."""
    response = client.get(f"/user/{project_id}/virtual_annotator")
    assert response.status_code == 200, response.text
    annotators = [
        UserRead.model_validate({**data, "password": None}) for data in response.json()
    ]
    assert {a.kind for a in annotators} <= {UserKind.VIRTUAL}
    return {annotator.first_name: annotator.id for annotator in annotators}


@pytest.fixture(scope="function")
def migrated(
    db_session: Session, assistant_users_database: AssistantUsersDatabase
) -> AssistantUsersDatabase:
    """Run the upgrade of the data migration on the fixture database, as alembic
    does: with the `op` proxy bound to the connection of the session."""
    migration = _load_migration()
    context = MigrationContext.configure(db_session.connection())
    with Operations.context(context):
        migration.upgrade()
    db_session.commit()
    return assistant_users_database


# ===========================================================================
# MIGRATE ASSISTANT USERS TO VIRTUAL ANNOTATORS (5aba4c95cf5f) TESTS
# ===========================================================================


def test_migration_creates_virtual_annotators_only_where_assistants_have_data(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """Every project gets a virtual annotator per assistant user that has data in
    it, and no other."""
    assert _virtual_annotators(client, migrated["project"].id).keys() == {
        "Assistant (zero-shot)",
        "Assistant (few-shot)",
    }
    assert _virtual_annotators(client, migrated["other_project"].id).keys() == {
        "Assistant (trained)"
    }
    assert _virtual_annotators(client, migrated["empty_project"].id) == {}


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


def test_migration_moves_annotations_to_the_virtual_annotators(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """Annotations keep their ids and belong to the virtual annotator of their
    assistant in their project."""
    project_annotators = _virtual_annotators(client, migrated["project"].id)
    other_annotators = _virtual_annotators(client, migrated["other_project"].id)
    expected_span_users = {
        **{
            span_id: project_annotators["Assistant (zero-shot)"]
            for span_id in migrated["zeroshot_span_ids"]
        },
        migrated["fewshot_span_id"]: project_annotators["Assistant (few-shot)"],
        migrated["trained_span_id"]: other_annotators["Assistant (trained)"],
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
        == (project_annotators["Assistant (zero-shot)"])
    )
    annotators = client.get(f"/sdoc/{migrated['sdoc'].id}/annotators").json()
    assert set(annotators) == {
        project_annotators["Assistant (zero-shot)"],
        project_annotators["Assistant (few-shot)"],
        migrated["user"].id,
    }


def test_migration_remaps_the_provenance_of_copies(
    client: TestClient, migrated: AssistantUsersDatabase
):
    """A human copy of an assistant annotation records the virtual annotator as
    its source user."""
    zeroshot = _virtual_annotators(client, migrated["project"].id)[
        "Assistant (zero-shot)"
    ]

    response = client.get(f"/span/{migrated['human_copy_id']}")

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.source_user_id == zeroshot
    assert copy.source_annotation_id == migrated["zeroshot_span_ids"][0]


def test_migration_moves_memos_by_and_about_the_assistant(
    client: TestClient, db_session: Session, migrated: AssistantUsersDatabase
):
    """The memo the assistant wrote belongs to its virtual annotator; the memo
    about the assistant user is attached to the virtual annotator."""
    zeroshot = _virtual_annotators(client, migrated["project"].id)[
        "Assistant (zero-shot)"
    ]

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
    filter on its virtual annotator; other users in the filter stay."""
    zeroshot = _virtual_annotators(client, migrated["project"].id)[
        "Assistant (zero-shot)"
    ]

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
