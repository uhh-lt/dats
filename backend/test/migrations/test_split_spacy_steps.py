import importlib.util
from pathlib import Path
from types import ModuleType

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.orm import Session

from .conftest import (
    ML_COREFERENCE,
    SPLIT_STEPS_BY_DOCTYPE,
    SplitStepsDocument,
)

MIGRATION = (
    Path(__file__).parents[2]
    / "src/migrations/alembic/versions"
    / "f2811eafb060_split_spacy_steps_and_add_document_.py"
)


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_f2811eafb060", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="function")
def migrated(
    db_session: Session, split_steps_database: dict[str, SplitStepsDocument]
) -> dict[str, SplitStepsDocument]:
    """Run the data part of the migration on the fixture database (the schema is
    already migrated), as alembic does: with the `op` proxy bound to the
    connection of the session."""
    migration = _load_migration()
    context = MigrationContext.configure(db_session.connection())
    with Operations.context(context):
        migration._migrate_step_status()
    db_session.commit()
    return split_steps_database


def _row(db: Session, sdoc_id: int) -> sa.RowMapping:
    return (
        db.execute(
            sa.text("SELECT * FROM sourcedocument WHERE id = :id"), {"id": sdoc_id}
        )
        .one()
        ._mapping
    )


# ===========================================================================
# SPLIT SPACY STEPS AND ADD DOCUMENT EMBEDDING STEP (f2811eafb060) TESTS
# ===========================================================================


def test_migration_snapshot_matches_the_status_columns_before():
    """The migration's snapshot of the old status columns contains every step
    of the fixture, and the new columns are not among them."""
    migration = _load_migration()

    fixture_steps = {s for steps in SPLIT_STEPS_BY_DOCTYPE.values() for s in steps}
    assert fixture_steps <= set(migration.OLD_STATUS_COLUMNS)
    assert not set(migration.NEW_COLUMNS) & set(migration.OLD_STATUS_COLUMNS)


def test_migration_keeps_the_processed_status_of_every_document(
    db_session: Session, migrated: dict[str, SplitStepsDocument]
):
    """No document changes its processed_status: finished, processing and
    erroneous documents, with and without document embeddings, keep it."""
    for name, document in migrated.items():
        row = _row(db_session, document["sdoc_id"])
        assert row["processed_status"] == document["status_before"], name


def test_migration_copies_text_spacy_into_the_spacy_steps(
    db_session: Session, migrated: dict[str, SplitStepsDocument]
):
    """Keywords, word frequencies and named entities get the status of
    text_spacy, which wrote them before."""
    for name, document in migrated.items():
        row = _row(db_session, document["sdoc_id"])
        for column in ("text_keywords", "text_word_frequency", "text_ner"):
            assert row[column] == document["text_spacy"], (name, column)


def test_migration_sets_document_embedding_from_the_ml_job(
    db_session: Session, migrated: dict[str, SplitStepsDocument]
):
    """text_document_embedding is finished where the ML job finished, and not
    planned (NULL) where it failed or never ran."""
    for name, document in migrated.items():
        row = _row(db_session, document["sdoc_id"])
        expected = 1 if document["document_embedding_finished"] else None
        assert row["text_document_embedding"] == expected, name


def test_migration_deletes_only_the_rows_of_the_removed_ml_jobs(
    db_session: Session, migrated: dict[str, SplitStepsDocument]
):
    """The DOCUMENT_EMBEDDING and SENTENCE_EMBEDDING rows are deleted, the
    COREFERENCE_RESOLUTION rows stay."""
    sdoc_ids = [d["sdoc_id"] for d in migrated.values()]
    types = db_session.execute(
        sa.text(
            "SELECT DISTINCT type FROM sourcedocumentjobstatus WHERE id = ANY(:ids)"
        ),
        {"ids": sdoc_ids},
    ).scalars()

    assert set(types) == {ML_COREFERENCE}
