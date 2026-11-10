import importlib.util
from pathlib import Path
from types import ModuleType

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.orm import Session

from .conftest import SDOC_STEPS_BY_DOCTYPE, SdocStatusDocument

MIGRATION = (
    Path(__file__).parents[2]
    / "src/migrations/alembic/versions"
    / "448579029394_sdoc_status_null_means_not_planned.py"
)


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_448579029394", MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="function")
def migrated(
    db_session: Session, sdoc_status_database: dict[str, SdocStatusDocument]
) -> dict[str, SdocStatusDocument]:
    """Run the data part of the migration on the fixture database (the schema is
    already migrated), as alembic does: with the `op` proxy bound to the
    connection of the session."""
    migration = _load_migration()
    context = MigrationContext.configure(db_session.connection())
    with Operations.context(context):
        migration._unplan_steps_of_other_doctypes()
    db_session.commit()
    return sdoc_status_database


def _row(db: Session, sdoc_id: int) -> sa.Row:
    return db.execute(
        sa.text("SELECT * FROM sourcedocument WHERE id = :id"), {"id": sdoc_id}
    ).one()


# ===========================================================================
# SDOC STATUS NULL MEANS NOT PLANNED (448579029394) TESTS
# ===========================================================================


def test_migration_snapshot_matches_the_fixture_steps():
    """The step lists hardcoded in the migration are the steps per doctype that
    the fixture describes as the state before the migration."""
    migration = _load_migration()

    assert migration.STEPS_BY_DOCTYPE == {
        doctype.value: steps for doctype, steps in SDOC_STEPS_BY_DOCTYPE.items()
    }


def test_migration_keeps_the_processed_status_of_every_document(
    db_session: Session, migrated: dict[str, SdocStatusDocument]
):
    """No document changes its processed_status: finished, processing and
    erroneous documents of every doctype keep it."""
    for name, document in migrated.items():
        row = _row(db_session, document["sdoc_id"])
        assert row.processed_status == document["status_before"], name


def test_migration_unplans_the_steps_of_other_doctypes(
    db_session: Session, migrated: dict[str, SdocStatusDocument]
):
    """Exactly the steps of the document's doctype stay set; total_jobs counts
    them."""
    migration = _load_migration()
    for name, document in migrated.items():
        row = _row(db_session, document["sdoc_id"])._mapping
        steps = SDOC_STEPS_BY_DOCTYPE[document["doctype"]]
        planned = {c for c in migration.STATUS_COLUMNS if row[c] is not None}
        assert planned == set(steps), name
        assert row["total_jobs"] == len(steps), name
