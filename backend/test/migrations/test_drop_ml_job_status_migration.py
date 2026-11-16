import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import ARTEFACT_COMPUTATIONS, DROP_ML_JOB_STATUS, alembic_config


def _columns(db: Session) -> list[str]:
    """The columns of `sourcedocumentjobstatus`, empty if the table is gone."""
    db.commit()
    inspector = sa.inspect(db.get_bind())
    if not inspector.has_table("sourcedocumentjobstatus"):
        return []
    return [c["name"] for c in inspector.get_columns("sourcedocumentjobstatus")]


# ===========================================================================
# DROP THE ML JOB STATUS TABLE (62a07ecd1e32) TESTS
# ===========================================================================


def test_upgrade_drops_the_ml_job_status_table(
    db_session: Session, ml_job_status_database: int
):
    """The table goes with its rows; no ML job status is migrated (nobody used
    the ML jobs)."""
    command.upgrade(alembic_config(), DROP_ML_JOB_STATUS)

    assert _columns(db_session) == []


def test_downgrade_recreates_the_empty_ml_job_status_table(
    db_session: Session, ml_job_status_database: int
):
    """The downgrade recreates the table with its columns, without rows."""
    config = alembic_config()
    command.upgrade(config, DROP_ML_JOB_STATUS)
    command.downgrade(config, ARTEFACT_COMPUTATIONS)

    assert _columns(db_session) == ["id", "type", "status", "timestamp"]
    count = db_session.execute(
        sa.text("SELECT count(*) FROM sourcedocumentjobstatus")
    ).scalar_one()
    db_session.commit()
    assert count == 0
