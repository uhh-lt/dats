import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import (
    HUMAN_CODE,
    KEPT_STEPS,
    RENAME_STEPS,
    RENAMED_STEPS,
    alembic_config,
)


def _steps(db: Session, sdoc_id: int) -> dict[str, int]:
    """The step status rows of the document: status per step."""
    rows = db.execute(
        sa.text(
            "SELECT step, status FROM sourcedocumentstepstatus WHERE sdoc_id = :id"
        ),
        {"id": sdoc_id},
    ).all()
    db.commit()
    return {step: status for step, status in rows}


# ===========================================================================
# RENAME THE PIPELINE STEPS (10b8dac1fdd6) TESTS
# ===========================================================================


def test_upgrade_renames_the_steps_and_keeps_their_status(
    db_session: Session, old_step_names_database: dict[str, int]
):
    """Every old step name gets its new name with its status; the kept names
    stay as they are."""
    command.upgrade(alembic_config(), RENAME_STEPS)

    expected = {
        RENAMED_STEPS.get(step, step): old_step_names_database[step]
        for step in [*RENAMED_STEPS, *KEPT_STEPS]
    }
    assert _steps(db_session, old_step_names_database["sdoc_id"]) == expected


def test_downgrade_restores_the_old_step_names(
    db_session: Session, old_step_names_database: dict[str, int]
):
    """The downgrade renames the steps back, with their status."""
    config = alembic_config()
    command.upgrade(config, RENAME_STEPS)
    command.downgrade(config, HUMAN_CODE)

    expected = {
        step: old_step_names_database[step] for step in [*RENAMED_STEPS, *KEPT_STEPS]
    }
    assert _steps(db_session, old_step_names_database["sdoc_id"]) == expected
