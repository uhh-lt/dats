"""crud_code.create_system_codes creates the system code trees an artefact
declares. `test_project` was created with the system codes of the config, so
the root `SYSTEM_CODE` and the tree `NAMED_ENTITY` > `PERSON` exist in it."""

import pytest
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_exceptions import SystemCodeConflictError
from core.code.system_codes import ROOT, SystemCode
from core.project.project_orm import ProjectORM


def _parent_name(db: Session, project_id: int, name: str) -> str | None:
    """The name of the parent of the code of this name in the project."""
    code = crud_code.read_by_name(db=db, code_name=name, project_id=project_id)
    assert code is not None, name
    if code.parent_id is None:
        return None
    return crud_code.read(db=db, project_id=code.project_id, id=code.parent_id).name


def test_create_system_codes_creates_the_missing_codes_once(
    db_session: Session, test_project: ProjectORM
):
    """A new tree is created below the root as system codes with their flags;
    a second call creates nothing."""
    tree = SystemCode(
        name="TEST_PARENT",
        description="A test parent",
        children=(SystemCode(name="TEST_CHILD", description="A child", enabled=False),),
    )

    created = crud_code.create_system_codes(
        db=db_session, project_id=test_project.id, codes=[tree]
    )
    again = crud_code.create_system_codes(
        db=db_session, project_id=test_project.id, codes=[tree]
    )

    assert [(c.name, c.is_system, c.enabled) for c in created] == [
        ("TEST_PARENT", True, True),
        ("TEST_CHILD", True, False),
    ]
    assert again == []
    assert _parent_name(db_session, test_project.id, "TEST_PARENT") == ROOT
    assert _parent_name(db_session, test_project.id, "TEST_CHILD") == "TEST_PARENT"


def test_create_system_codes_reuses_a_system_code_with_the_declared_parent(
    db_session: Session, test_project: ProjectORM
):
    """`NAMED_ENTITY` > `PERSON` exists below the root: declaring it again
    creates nothing."""
    tree = SystemCode(
        name="NAMED_ENTITY",
        description="A named entity",
        children=(SystemCode(name="PERSON", description="People"),),
    )

    assert (
        crud_code.create_system_codes(
            db=db_session, project_id=test_project.id, codes=[tree]
        )
        == []
    )


def test_create_system_codes_rejects_a_user_code_of_the_name(
    db_session: Session, test_project: ProjectORM
):
    """A user code named like a declared code is not adopted: 409."""
    crud_code.create(
        db=db_session,
        project_id=test_project.id,
        create_dto=CodeCreate(name="TEST_TAKEN", is_system=False),
    )

    with pytest.raises(SystemCodeConflictError, match="a user code has the name"):
        crud_code.create_system_codes(
            db=db_session,
            project_id=test_project.id,
            codes=[SystemCode(name="TEST_TAKEN", description="Declared")],
        )


def test_create_system_codes_rejects_a_system_code_with_another_parent(
    db_session: Session, test_project: ProjectORM
):
    """`PERSON` exists below `NAMED_ENTITY`: declaring it below another code is
    rejected."""
    tree = SystemCode(
        name="TEST_OTHER_PARENT",
        description="Another parent",
        children=(SystemCode(name="PERSON", description="People"),),
    )

    with pytest.raises(SystemCodeConflictError, match="has another parent"):
        crud_code.create_system_codes(
            db=db_session, project_id=test_project.id, codes=[tree]
        )


def test_create_system_codes_accepts_overlapping_trees(
    db_session: Session, test_project: ProjectORM
):
    """Two trees that share their top code create it once, with both children."""
    trees = [
        SystemCode(
            name="TEST_SHARED",
            description="Shared",
            children=(SystemCode(name="TEST_X", description="X"),),
        ),
        SystemCode(
            name="TEST_SHARED",
            description="Shared",
            children=(SystemCode(name="TEST_Y", description="Y"),),
        ),
    ]

    created = crud_code.create_system_codes(
        db=db_session, project_id=test_project.id, codes=trees
    )

    assert [c.name for c in created] == ["TEST_SHARED", "TEST_X", "TEST_Y"]


def test_create_system_codes_without_codes_creates_nothing(
    db_session: Session, test_project: ProjectORM
):
    """An empty list creates nothing."""
    before = crud_code.read_system_codes_by_project(
        db=db_session, project_id=test_project.id
    )

    created = crud_code.create_system_codes(
        db=db_session, project_id=test_project.id, codes=[]
    )

    assert created == []
    assert (
        crud_code.read_system_codes_by_project(
            db=db_session, project_id=test_project.id
        )
        == before
    )
