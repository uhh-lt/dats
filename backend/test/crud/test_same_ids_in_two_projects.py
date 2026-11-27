"""Ids are unique per project only: a row is identified by (project_id, id). The
twin project holds a copy of every row of the project with the same id, so every
relationship and every read that matches a row by its id alone, or reads the rows of
all projects, would find the rows of both projects."""

import inspect as pyinspect
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from pydantic import BaseModel
from sqlalchemy import Column, Row, inspect, select
from sqlalchemy.orm import Mapper, RelationshipProperty, Session
from sqlalchemy.sql.visitors import iterate

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from composite_keys_test_utils import NOT_COPIED_TABLES, TenantRows, TwinProjects
from core.memo.memo_enum import AttachedObjectType
from core.search.bbox_anno_search.bbox_anno_search import find_bbox_annotations
from core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from core.search.memo_search.memo_search import find_memos
from core.search.memo_search.memo_search_columns import MemoColumns
from core.search.sdoc_search.sdoc_search import find_sdocs
from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from core.search.search_dto import QueryRequest
from core.search.sent_anno_search.sent_anno_search import find_sentence_annotations
from core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from core.search.span_anno_search.span_anno_search import find_span_annotations
from core.search.span_anno_search.span_anno_search_columns import SpanColumns
from modules.code_frequency.code_frequency_service import CodeFrequencyService
from modules.search_view.search_view_enum import SearchEntityType
from modules.statistics.statistics_service import StatisticsService
from modules.timeline_analysis.timeline_analysis_service import (
    TimelineAnalysisService,
)
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_service import WordFrequencyService
from repos.db.orm_base import ORMBase
from systems.search_system.filtering import Filter
from systems.search_system.sorting import SortDirection
from utils.import_utils import import_by_suffix

from .conftest import LoneProject

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


PROJECT_RELATIONSHIPS = [
    pytest.param(
        mapper, relationship, id=f"{mapper.class_.__name__}.{relationship.key}"
    )
    for mapper, relationship in _project_relationships()
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
# READS
# ===========================================================================
# Each read is answered in the project while it is alone, again after the twin
# exists, and in the twin. A read that matched a row by its id alone, or read the
# rows of all projects, would answer differently after the twin exists.


def _snapshot(value: Any) -> Any:
    """The value as plain data: the columns of an ORM object, the fields of a DTO."""
    if isinstance(value, ORMBase):
        return {
            column.key: getattr(value, column.key)
            for column in inspect(value).mapper.column_attrs
        }
    if isinstance(value, BaseModel):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: _snapshot(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, Row)):
        return [_snapshot(item) for item in value]
    if isinstance(value, (set, frozenset)):
        return sorted((_snapshot(item) for item in value), key=repr)
    return value


def _in_project(value: Any, source_id: int, target_id: int) -> Any:
    """The snapshot of the source project as the target project would answer it."""
    if isinstance(value, dict):
        return {
            key: target_id
            if str(key).endswith("project_id") and item == source_id
            else _in_project(item, source_id, target_id)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_in_project(item, source_id, target_id) for item in value]
    if isinstance(value, str):
        return value.replace(f"projects/{source_id}/", f"projects/{target_id}/")
    return value


# a read: a function of the session and the project id
Read = Callable[[Session, int], Any]


def _answers(db: Session, reads: dict[str, Read], project_id: int) -> dict[str, Any]:
    """The snapshot of every read in the project, or the name of its error."""
    answers = {}
    for name, read in reads.items():
        db.expire_all()
        try:
            answers[name] = _snapshot(read(db, project_id))
        except Exception as error:
            db.rollback()
            answers[name] = f"raises {type(error).__name__}: {error}"
    return answers


def _assert_same_answers(
    db: Session,
    lone: LoneProject,
    reads: dict[str, Read],
    not_copied: frozenset[str] = frozenset(),
):
    """Every read answers without error in the project alone, the same after the
    twin exists, and (apart from the reads of what the twin does not copy) in the
    twin as in the project alone."""
    project_id = lone["project"].id
    alone = _answers(db, reads, project_id)
    twin_id = lone["create_twin"]().id
    after = _answers(db, reads, project_id)
    in_twin = _answers(db, reads, twin_id)

    def differences(actual: dict[str, Any], expected: dict[str, Any]) -> list[str]:
        return [
            f"{name}: {actual[name]!r:.300} != {expected[name]!r:.300}"
            for name in expected
            if actual[name] != expected[name]
        ]

    assert {
        name: answer
        for name, answer in alone.items()
        if isinstance(answer, str) and answer.startswith("raises")
    } == {}
    assert differences(after, alone) == []
    expected_in_twin = {
        name: _in_project(answer, project_id, twin_id)
        for name, answer in alone.items()
        if name not in not_copied
    }
    assert differences(in_twin, expected_in_twin) == []


# --- A. CRUD reads -------------------------------------------------------------
# Every public read of a CRUD that takes db and project_id (read*, count*,
# exists*, without the ones that create), called with the rows of the project.

# the value of a parameter of a CRUD read, by its name, on the rows of the project
PARAMETERS: dict[str, Callable[[TenantRows], Any]] = {
    "user_id": lambda rows: rows["adoc"].user_id,
    "sdoc_id": lambda rows: rows["sdoc"].id,
    "sdoc_ids": lambda rows: [rows["sdoc"].id],
    "code_id": lambda rows: rows["code"].id,
    "code_ids": lambda rows: [rows["code"].id, rows["child_code"].id],
    "tag_ids": lambda rows: [rows["tag"].id, rows["child_tag"].id],
    "folder_id": lambda rows: rows["folder"].id,
    "folder_ids": lambda rows: [rows["folder"].id, rows["child_folder"].id],
    "tag_id": lambda rows: rows["tag"].id,
    "aspect_id": lambda rows: rows["aspect"].id,
    "experiment_id": lambda rows: rows["experiment"].id,
    "cluster_id": lambda rows: rows["cluster"].id,
    "level": lambda rows: rows["cluster"].level,
    "prompt_id": lambda rows: rows["prompt"].id,
    "memo_ids": lambda rows: [rows["memo"].id, rows["bare_memo"].id],
    "attached_object_type": lambda rows: AttachedObjectType.code,
    "object_ids": lambda rows: [rows["code"].id],
    "limit": lambda rows: 10,
    "status": lambda rows: SDocStatus.finished,
    "doctype": lambda rows: DocType.text,
    "folder_type": lambda rows: rows["folder"].folder_type,
    "entity_type": lambda rows: SearchEntityType(rows["search_view"].entity_type),
    "filename": lambda rows: rows["sdoc"].filename,
    "code_name": lambda rows: rows["code"].name,
    "folder_name": lambda rows: rows["folder"].name,
    "key": lambda rows: rows["project_metadata"].key,
    "keys": lambda rows: [rows["project_metadata"].key],
    "metatype": lambda rows: rows["project_metadata"].metatype,
    "ml_job_id": lambda rows: rows["tag_recommendation"].ml_job_id,
    "steps": lambda rows: [rows["step_status"].step],
    "order_by": lambda rows: [(rows["step_status"].step, SortDirection.ASC)],
    "emails": lambda rows: [rows["virtual_user"].email],
}

# the parameters whose value is a column of the CRUD's own rows in the project: the
# first value for the singular, all values for the plural
OWN_COLUMNS = {"id", "uuid", "name"}


def _bound(method: Callable[..., Any], arguments: dict[str, Any]) -> Read:
    return lambda db, project_id: method(db=db, project_id=project_id, **arguments)


def _crud_reads(db: Session, rows: TenantRows) -> dict[str, Read]:
    """The CRUD reads with the arguments of the rows, by "<CRUD>.<method>"."""
    reads: dict[str, Read] = {}
    missing: set[str] = set()
    cruds = {
        id(crud): crud
        for module in import_by_suffix("_crud.py")
        for crud in vars(module).values()
        if type(crud).__name__.startswith("CRUD")
    }
    for crud in cruds.values():
        for name, method in pyinspect.getmembers(crud, pyinspect.ismethod):
            parameters = pyinspect.signature(method).parameters
            if (
                not name.startswith(("read", "count", "exists"))
                or "create" in name
                or not {"db", "project_id"} <= set(parameters)
            ):
                continue
            arguments: dict[str, Any] = {}
            for parameter in parameters.values():
                if parameter.name in ("db", "project_id") or (
                    parameter.default is not parameter.empty
                ):
                    continue
                column = parameter.name.removesuffix("s")
                if column in OWN_COLUMNS:
                    values = list(
                        db.scalars(
                            select(getattr(crud.model, column))
                            .where(crud.model.project_id == rows["project"].id)
                            .order_by(crud.model.id)
                        )
                    )
                    arguments[parameter.name] = (
                        values if parameter.name != column else values[0]
                    )
                elif parameter.name in PARAMETERS:
                    arguments[parameter.name] = PARAMETERS[parameter.name](rows)
                else:
                    missing.add(f"{type(crud).__name__}.{name}: {parameter.name}")
            reads[f"{type(crud).__name__}.{name}"] = _bound(method, arguments)
    assert not missing, f"add the parameters to PARAMETERS: {missing}"
    return reads


def test_every_crud_read_answers_the_same_after_a_project_with_the_same_ids_exists(
    db_session: Session, lone_project: LoneProject
):
    """Every CRUD read of the project answers the same before and after the twin
    exists, and the twin answers the same with its own project id, apart from the
    reads of the users (members and virtual users), which the twin does not copy."""
    reads = _crud_reads(db_session, lone_project["rows"])
    users = frozenset(name for name in reads if name.startswith("CRUDUser."))
    assert len(reads) >= 150

    _assert_same_answers(db_session, lone_project, reads, not_copied=users)


# --- B. service queries ---------------------------------------------------------
# The hand-written queries of the searches and analyses, with filters by the
# ids of the project.


def _ids_filter(column: str, value: int) -> dict[str, Any]:
    return {
        "id": "root",
        "logic_operator": "and",
        "items": [
            {"id": "ids", "column": column, "operator": "IDLR_CONTAINS", "value": value}
        ],
    }


def _service_reads(lone: LoneProject) -> dict[str, Read]:
    rows = lone["rows"]
    user_id = rows["adoc"].user_id
    code_id, tag_id = rows["code"].id, rows["tag"].id
    sdoc_ids = {rows["sdoc"].id, rows["bare_sdoc"].id}
    return {
        "find_sdocs by tag": lambda db, project_id: find_sdocs(
            db,
            project_id=project_id,
            folder_id=None,
            search_query="",
            expert_mode=False,
            highlight=False,
            filter=Filter[SdocColumns].model_validate(
                _ids_filter("SD_TAG_ID_LIST_RECURSIVE", tag_id)
            ),
            sorts=[],
        ),
        "find_memos": lambda db, project_id: find_memos(
            db,
            project_id=project_id,
            request=QueryRequest[MemoColumns].model_validate(
                {"filter": {"id": "root", "logic_operator": "and", "items": []}}
            ),
            user_id=user_id,
        ),
        "find_span_annotations by code": lambda db, project_id: find_span_annotations(
            db,
            project_id=project_id,
            request=QueryRequest[SpanColumns].model_validate(
                {"filter": _ids_filter("SP_CODE_ID_LIST_RECURSIVE", code_id)}
            ),
            user_id=user_id,
        ),
        "find_sentence_annotations by code": lambda db, project_id: (
            find_sentence_annotations(
                db,
                project_id=project_id,
                request=QueryRequest[SentAnnoColumns].model_validate(
                    {"filter": _ids_filter("SentAnno_CODE_ID_LIST_RECURSIVE", code_id)}
                ),
                user_id=user_id,
            )
        ),
        "find_bbox_annotations by code": lambda db, project_id: find_bbox_annotations(
            db,
            project_id=project_id,
            request=QueryRequest[BBoxColumns].model_validate(
                {"filter": _ids_filter("BB_CODE_ID_LIST_RECURSIVE", code_id)}
            ),
            user_id=user_id,
        ),
        "word_frequency by tag": lambda db, project_id: (
            WordFrequencyService().word_frequency(
                db=db,
                project_id=project_id,
                filter=Filter[WordFrequencyColumns].model_validate(
                    _ids_filter("WF_TAG_ID_LIST_RECURSIVE", tag_id)
                ),
                sorts=[],
            )
        ),
        "code frequencies": lambda db, project_id: (
            CodeFrequencyService().compute_code_frequencies(
                db=db,
                project_id=project_id,
                user_ids=[user_id],
                code_ids=[code_id],
                doctypes=[DocType.text],
            )
        ),
        "code occurrences": lambda db, project_id: (
            CodeFrequencyService().compute_code_occurrences(
                db=db,
                project_id=project_id,
                user_ids=[user_id],
                code_id=code_id,
                doctypes=[DocType.text],
                return_children=True,
            )
        ),
        "tag statistics": lambda db, project_id: (
            StatisticsService().compute_tag_statistics(
                db=db, project_id=project_id, sdoc_ids=sdoc_ids
            )
        ),
        "code statistics": lambda db, project_id: (
            StatisticsService().compute_code_statistics(
                db=db, project_id=project_id, code_id=code_id, sdoc_ids=sdoc_ids
            )
        ),
        "timeline": lambda db, project_id: [
            concept.results
            for concept in TimelineAnalysisService()
            .recompute_timeline_analysis(
                db=db, project_id=project_id, id=rows["timeline_analysis"].id
            )
            .concepts
        ],
    }


def test_every_service_query_answers_the_same_after_a_project_with_the_same_ids_exists(
    db_session: Session, lone_project: LoneProject
):
    """Every service query of the project answers the same before and after the
    twin exists, and the twin answers the same with its own project id."""
    _assert_same_answers(db_session, lone_project, _service_reads(lone_project))
