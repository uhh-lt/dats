"""Ids are unique per project only: a row is identified by (project_id, id). The
twin project holds a copy of every row of the project with the same id, so every
read that matches a row by its id alone would find the rows of both projects."""

from collections.abc import Iterator

import pytest
from sqlalchemy import Column, inspect, select
from sqlalchemy.orm import Mapper, RelationshipProperty, Session
from sqlalchemy.sql.visitors import iterate

from composite_keys_test_utils import NOT_COPIED_TABLES, TwinProjects
from repos.db.orm_base import ORMBase
from repos.db.project_crud_base import ProjectCRUDBase
from utils.import_utils import import_by_suffix

# the global tables; a relationship onto or from them matches one column only
GLOBAL_MAPPERS = {
    "ProjectORM",
    "UserORM",
    "SpanTextORM",
    "ApiKeyORM",
    "RefreshTokenORM",
}


def _project_relationships() -> Iterator[tuple[Mapper, RelationshipProperty]]:
    for mapper in ORMBase.registry.mappers:
        if mapper.class_.__name__ in GLOBAL_MAPPERS:
            continue
        for relationship in mapper.relationships:
            if relationship.mapper.class_.__name__ not in GLOBAL_MAPPERS:
                yield mapper, relationship


def _project_cruds() -> list[ProjectCRUDBase]:
    return [
        crud
        for module in import_by_suffix("_crud.py")
        for crud in vars(module).values()
        if isinstance(crud, ProjectCRUDBase)
    ]


PROJECT_RELATIONSHIPS = [
    pytest.param(
        mapper, relationship, id=f"{mapper.class_.__name__}.{relationship.key}"
    )
    for mapper, relationship in _project_relationships()
]

PROJECT_CRUDS = [
    pytest.param(crud, id=type(crud).__name__) for crud in _project_cruds()
]


# ===========================================================================
# THE TWIN PROJECT
# ===========================================================================


def test_twin_project_holds_the_same_ids(
    db_session: Session, twin_projects: TwinProjects
):
    """Every project-owned table with rows in the project holds the same keys,
    apart from project_id, in the twin project."""
    project_id, twin_id = twin_projects["project"].id, twin_projects["twin"].id
    copied = 0
    for table in ORMBase.metadata.sorted_tables:
        if "project_id" not in table.c or table.name in NOT_COPIED_TABLES:
            continue
        key = [
            column
            for column in table.primary_key.columns
            if column.name != "project_id"
        ]

        def keys(pid: int) -> set[tuple[object, ...]]:
            rows = db_session.execute(select(*key).where(table.c.project_id == pid))
            return {tuple(row) for row in rows}

        assert keys(project_id) == keys(twin_id), table.name
        copied += bool(keys(project_id))

    assert copied >= 30


# ===========================================================================
# RELATIONSHIPS
# ===========================================================================


def test_every_relationship_between_project_rows_joins_on_the_project():
    """Every relationship between two project-owned tables compares project_id
    and the id, in its join and (for a many to many) in its secondary join."""
    missing = []
    for mapper, relationship in _project_relationships():
        for join in [relationship.primaryjoin, relationship.secondaryjoin]:
            if join is None:
                continue
            columns = {
                (column.table.name, column.name)
                for column in iterate(join)
                if isinstance(column, Column)
            }
            tables = {table for table, _ in columns}
            if not all((table, "project_id") in columns for table in tables):
                missing.append(f"{mapper.class_.__name__}.{relationship.key}: {join}")

    assert missing == []


@pytest.mark.parametrize("mapper,relationship", PROJECT_RELATIONSHIPS)
def test_relationship_loads_only_rows_of_the_own_project(
    db_session: Session,
    twin_projects: TwinProjects,
    mapper: Mapper,
    relationship: RelationshipProperty,
):
    """Loading the relationship of a row of either project returns rows of that
    project only, and as many as in the other project."""
    loaded: dict[int, list[tuple[int, int]]] = {}
    for project in [twin_projects["project"], twin_projects["twin"]]:
        db_session.expire_all()
        rows = db_session.scalars(
            select(mapper.class_)
            .where(mapper.columns["project_id"] == project.id)
            .order_by(*mapper.primary_key)
        ).all()
        targets = []
        for row in rows:
            value = getattr(row, relationship.key)
            for target in value if relationship.uselist else [value]:
                if target is None:
                    continue
                assert target.project_id == project.id
                targets.append(inspect(target).identity)
        # the identity without project_id
        loaded[project.id] = [key[1:] for key in targets]

    project_id, twin_id = twin_projects["project"].id, twin_projects["twin"].id
    assert loaded[project_id] == loaded[twin_id]


# ===========================================================================
# CRUD READS
# ===========================================================================


@pytest.mark.parametrize("crud", PROJECT_CRUDS)
def test_project_crud_reads_only_rows_of_the_given_project(
    db_session: Session, twin_projects: TwinProjects, crud: ProjectCRUDBase
):
    """The base reads of a project CRUD return the rows of the given project,
    also when the other project holds the same ids."""
    twin_id = twin_projects["twin"].id
    ids = list(
        db_session.scalars(
            select(crud.model.id).where(crud.model.project_id == twin_id)
        )
    )

    by_ids = crud.read_by_ids(db=db_session, project_id=twin_id, ids=ids)
    multi = crud.read_multi(db=db_session, project_id=twin_id, limit=10_000)

    assert [row.id for row in by_ids] == ids
    assert {row.project_id for row in [*by_ids, *multi]} <= {twin_id}
    assert len(multi) == len(ids)
