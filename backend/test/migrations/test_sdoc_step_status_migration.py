import importlib.util
from pathlib import Path
from types import ModuleType

import pytest
import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import (
    BEFORE_STEP_STATUS,
    ML_COREFERENCE,
    ML_DOCUMENT_EMBEDDING,
    ML_FINISHED,
    OLD_STATUS_COLUMNS,
    OLD_STEPS_BY_DOCTYPE,
    OldStatusDocument,
    alembic_config,
)

REVISION = "448579029394"
TABLE = "sourcedocumentstepstatus"
MIGRATION = (
    Path(__file__).parents[2]
    / "src/migrations/alembic/versions"
    / "448579029394_sdoc_step_status_per_feature.py"
)
SPACY_STEPS = ["text_keywords", "text_word_frequency", "text_ner"]


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_448579029394", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="function")
def upgraded(
    db_session: Session, old_status_database: dict[str, OldStatusDocument]
) -> dict[str, OldStatusDocument]:
    """The fixture database after the real upgrade of the migration."""
    command.upgrade(alembic_config(), REVISION)
    return old_status_database


def _row(db: Session, sdoc_id: int) -> dict:
    db.expire_all()
    row = db.execute(
        sa.text("SELECT * FROM sourcedocument WHERE id = :id"), {"id": sdoc_id}
    ).one()
    db.commit()
    return dict(row._mapping)


def _steps(db: Session, sdoc_id: int) -> dict[str, int]:
    """The rows of the document in the status table: status per planned step."""
    rows = db.execute(
        sa.text(f"SELECT step, status FROM {TABLE} WHERE sdoc_id = :id"),
        {"id": sdoc_id},
    ).all()
    db.commit()
    return {step: status for step, status in rows}


def _overall(steps: dict[str, int]) -> int:
    """The overall status the application derives from the steps."""
    return min(steps.values(), default=1)


def _job_rows(db: Session) -> set[tuple[int, int, int]]:
    rows = db.execute(sa.text("SELECT id, type, status FROM sourcedocumentjobstatus"))
    result = {(r.id, r.type, r.status) for r in rows}
    db.commit()
    return result


# ===========================================================================
# SDOC STEP STATUS PER FEATURE (448579029394) TESTS
# ===========================================================================


def test_migration_snapshot_matches_the_fixture_steps():
    """The step lists hardcoded in the migration are the steps per doctype that
    the fixture describes as the state before the migration."""
    migration = _load_migration()

    assert migration.STEPS_BY_DOCTYPE == {
        doctype.value: steps for doctype, steps in OLD_STEPS_BY_DOCTYPE.items()
    }
    assert set(migration.OLD_STATUS_COLUMNS) == set(OLD_STATUS_COLUMNS)


# --- A. upgrade -------------------------------------------------------------


def test_upgrade_keeps_the_processed_status_of_every_document(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """Every document keeps the overall status the application read before."""
    for name, document in upgraded.items():
        steps = _steps(db_session, document["sdoc_id"])
        assert _overall(steps) == document["status_before"].value, name


def test_upgrade_drops_the_step_columns(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """sourcedocument has no step status and no computed status column left."""
    row = _row(db_session, upgraded["text_finished"]["sdoc_id"])

    assert not set(row) & {*OLD_STATUS_COLUMNS, *SPACY_STEPS, "processed_jobs"}


def test_upgrade_plans_only_the_steps_of_the_doctype(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """The doctype's steps keep the status of their column; the columns of other
    doctypes' steps get no row (not planned)."""
    for name, document in upgraded.items():
        steps = _steps(db_session, document["sdoc_id"])
        old_steps = OLD_STEPS_BY_DOCTYPE[document["doctype"]]
        assert {c: steps[c] for c in OLD_STATUS_COLUMNS if c in steps} == {
            c: document["status"][c] for c in old_steps
        }, name


def test_upgrade_copies_text_spacy_into_the_spacy_steps(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """Keywords, word frequencies and named entities get the status of
    text_spacy, which computed them before."""
    for name, document in upgraded.items():
        steps = _steps(db_session, document["sdoc_id"])
        for step in SPACY_STEPS:
            assert steps[step] == document["status"]["text_spacy"], (name, step)


def test_upgrade_sets_the_document_embedding_where_its_ml_job_finished(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """text_finished had a finished DOCUMENT_EMBEDDING job: the step is finished.
    The failed job of text_processing and the documents without a job leave it
    not planned."""
    for name, document in upgraded.items():
        steps = _steps(db_session, document["sdoc_id"])
        expected = 1 if name == "text_finished" else None
        assert steps.get("text_document_embedding") == expected, name


def test_upgrade_deletes_only_the_rows_of_the_removed_ml_jobs(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """Only the COREFERENCE_RESOLUTION row is left."""
    sdoc_id = upgraded["text_finished"]["sdoc_id"]

    assert _job_rows(db_session) == {(sdoc_id, ML_COREFERENCE, ML_FINISHED)}


# --- B. downgrade -----------------------------------------------------------


def test_downgrade_restores_the_status_columns(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """After the downgrade every old column is set again (not planned steps are
    processing, 0, as before), the new steps are gone and processed_jobs is the
    sum of the old columns."""
    command.downgrade(alembic_config(), BEFORE_STEP_STATUS)

    for name, document in upgraded.items():
        row = _row(db_session, document["sdoc_id"])
        steps = OLD_STEPS_BY_DOCTYPE[document["doctype"]]
        expected = {
            c: document["status"][c] if c in steps else 0 for c in OLD_STATUS_COLUMNS
        }
        assert {c: row[c] for c in OLD_STATUS_COLUMNS} == expected, name
        assert row["processed_jobs"] == sum(expected.values()), name
        assert "text_keywords" not in row, name
    table = db_session.execute(sa.text(f"SELECT to_regclass('{TABLE}')")).scalar()
    db_session.commit()
    assert table is None


def test_downgrade_restores_the_document_embedding_job(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """The finished document embedding of text_finished becomes a finished
    DOCUMENT_EMBEDDING row again; the SENTENCE_EMBEDDING row cannot be
    restored."""
    sdoc_id = upgraded["text_finished"]["sdoc_id"]

    command.downgrade(alembic_config(), BEFORE_STEP_STATUS)

    assert _job_rows(db_session) == {
        (sdoc_id, ML_COREFERENCE, ML_FINISHED),
        (sdoc_id, ML_DOCUMENT_EMBEDDING, ML_FINISHED),
    }


def test_upgrade_after_a_downgrade_gives_the_same_status(
    db_session: Session, upgraded: dict[str, OldStatusDocument]
):
    """A round trip (down and up again) keeps every document's step statuses:
    the steps of other doctypes, processing (0) after the downgrade, are not
    planned again."""
    before = {name: _steps(db_session, d["sdoc_id"]) for name, d in upgraded.items()}

    command.downgrade(alembic_config(), BEFORE_STEP_STATUS)
    command.upgrade(alembic_config(), REVISION)

    for name, document in upgraded.items():
        steps = _steps(db_session, document["sdoc_id"])
        assert _overall(steps) == document["status_before"].value, name
        assert steps == before[name], name
