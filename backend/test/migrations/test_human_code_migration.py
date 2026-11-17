import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import (
    DROP_ML_JOB_STATUS,
    HUMAN_CODE,
    PersonBoxesDatabase,
    alembic_config,
)


def _box_codes(db: Session, box_ids: list[int]) -> list[str]:
    """The code names of the boxes, in the order of the ids."""
    db.expire_all()
    rows = db.execute(
        sa.text(
            "SELECT b.id, c.name FROM bboxannotation b "
            "JOIN code c ON c.id = b.code_id WHERE b.id = ANY(:ids)"
        ),
        {"ids": box_ids},
    ).all()
    names: dict[int, str] = {row.id: row.name for row in rows}
    db.commit()
    return [names[box_id] for box_id in box_ids]


def _human(db: Session, project_id: int) -> tuple[int, bool, bool, str, str] | None:
    """(id, is_system, enabled, description, parent name) of the code HUMAN."""
    row = db.execute(
        sa.text(
            "SELECT c.id, c.is_system, c.enabled, c.description, p.name "
            "FROM code c LEFT JOIN code p ON p.id = c.parent_id "
            "WHERE c.project_id = :project_id AND c.name = 'HUMAN'"
        ),
        {"project_id": project_id},
    ).one_or_none()
    db.commit()
    return None if row is None else tuple(row)  # type: ignore[return-value]


# ===========================================================================
# OBJECT BOXES OF PEOPLE GET THE CODE HUMAN (a7b1a760a827) TESTS
# ===========================================================================


def test_upgrade_moves_the_system_users_person_boxes_to_the_new_code_human(
    db_session: Session, person_boxes_database: PersonBoxesDatabase
):
    """`coco` gets the enabled system code HUMAN below SYSTEM_CODE; the system
    user's PERSON boxes move to it, its CAT box and the user's PERSON box
    stay."""
    db = person_boxes_database
    project_id = db["coco_project_id"]

    command.upgrade(alembic_config(), HUMAN_CODE)

    human = _human(db_session, project_id)
    assert human is not None
    assert human[1:] == (True, True, "Object Category from COCO 2017", "SYSTEM_CODE")
    assert _box_codes(db_session, db["system_person_box_ids"][project_id]) == [
        "HUMAN",
        "HUMAN",
    ]
    assert _box_codes(db_session, db["system_cat_box_ids"][project_id]) == ["CAT"]
    assert _box_codes(db_session, db["user_person_box_ids"][project_id]) == ["PERSON"]


def test_upgrade_skips_a_project_with_a_code_human_of_its_own(
    db_session: Session, person_boxes_database: PersonBoxesDatabase
):
    """`own human` keeps its user code HUMAN as it is, gets no system code and
    keeps every PERSON box on PERSON."""
    db = person_boxes_database
    project_id = db["own_human_project_id"]

    command.upgrade(alembic_config(), HUMAN_CODE)

    assert _human(db_session, project_id) == (
        db["own_human_code_id"],
        False,
        True,
        "My people",
        None,
    )
    assert _box_codes(db_session, db["system_person_box_ids"][project_id]) == [
        "PERSON",
        "PERSON",
    ]


def test_downgrade_moves_the_boxes_back_to_person_and_deletes_human(
    db_session: Session, person_boxes_database: PersonBoxesDatabase
):
    """After the downgrade `coco` has no code HUMAN and the system user's
    boxes are PERSON boxes again; the user code HUMAN of `own human` stays."""
    db = person_boxes_database
    config = alembic_config()
    command.upgrade(config, HUMAN_CODE)
    command.downgrade(config, DROP_ML_JOB_STATUS)

    project_id = db["coco_project_id"]
    assert _human(db_session, project_id) is None
    assert _box_codes(db_session, db["system_person_box_ids"][project_id]) == [
        "PERSON",
        "PERSON",
    ]
    assert _human(db_session, db["own_human_project_id"]) is not None
