import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import ARTEFACT_COMPUTATIONS, CAPTIONS_CORE, alembic_config


def _column(db: Session, project_id: int, column: str) -> dict:
    """The value of the JSONB column of the project."""
    db.expire_all()
    value = db.execute(
        sa.text(f"SELECT {column} FROM project WHERE id = :id"), {"id": project_id}
    ).scalar_one()
    db.commit()
    return dict(value)


# ===========================================================================
# RENAME THE FEATURE ACTIVATIONS TO ARTEFACT COMPUTATIONS (457909d274d4) TESTS
# ===========================================================================


def test_upgrade_renames_the_column_and_drops_the_pending_activations(
    db_session: Session, feature_activations_database: int
):
    """The pending activation is gone: its job finds no pending computation."""
    command.upgrade(alembic_config(), ARTEFACT_COMPUTATIONS)

    assert (
        _column(db_session, feature_activations_database, "artefact_computations") == {}
    )


def test_downgrade_restores_the_column_name(
    db_session: Session, feature_activations_database: int
):
    """The downgrade renames the column back, with no pending activation."""
    config = alembic_config()
    command.upgrade(config, ARTEFACT_COMPUTATIONS)
    command.downgrade(config, CAPTIONS_CORE)

    assert (
        _column(db_session, feature_activations_database, "feature_activations") == {}
    )
