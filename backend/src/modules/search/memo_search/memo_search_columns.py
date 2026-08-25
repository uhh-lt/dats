from sqlalchemy import String, and_, case, cast, func
from sqlalchemy.orm import aliased

from common.crud_enum import Crud
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.grouping import (
    NONE_GROUP_KEY,
    DateGranularity,
    GroupExpressions,
)
from systems.search_system.search_builder import SearchBuilder


def build_memo_subquery(db, project_id: int, user_id: int):
    """Build the full memo projection as a SQLAlchemy query (pre-subquery).

    Selects every column the memo search/group/sort engine needs, joined across
    all attached-object types, the author, and the per-user favorites link.
    """
    # Aliased tables shared by the memo subquery projection.
    handle = aliased(ObjectHandleORM)
    span_group = aliased(SpanGroupORM)
    source_document = aliased(SourceDocumentORM)
    code = aliased(CodeORM)
    tag = aliased(TagORM)
    project = aliased(ProjectORM)
    author = aliased(UserORM)
    favorite = aliased(MemoFavoriteLinkTable)

    # Resolved expressions reused across columns.
    attached_object_id_expr = func.coalesce(
        handle.source_document_id,
        handle.code_id,
        handle.tag_id,
        handle.project_id,
        handle.span_annotation_id,
        handle.sentence_annotation_id,
        handle.bbox_annotation_id,
        handle.span_group_id,
    )
    attached_object_type_expr = case(
        (
            handle.source_document_id.is_not(None),
            AttachedObjectType.source_document.value,
        ),
        (handle.code_id.is_not(None), AttachedObjectType.code.value),
        (handle.tag_id.is_not(None), AttachedObjectType.tag.value),
        (handle.project_id.is_not(None), AttachedObjectType.project.value),
        (
            handle.span_annotation_id.is_not(None),
            AttachedObjectType.span_annotation.value,
        ),
        (
            handle.sentence_annotation_id.is_not(None),
            AttachedObjectType.sentence_annotation.value,
        ),
        (
            handle.bbox_annotation_id.is_not(None),
            AttachedObjectType.bbox_annotation.value,
        ),
        (handle.span_group_id.is_not(None), AttachedObjectType.span_group.value),
    )
    attached_object_label_expr = case(
        (handle.source_document_id.is_not(None), source_document.name),
        (handle.code_id.is_not(None), code.name),
        (handle.tag_id.is_not(None), tag.name),
        (handle.project_id.is_not(None), project.title),
        (
            handle.span_annotation_id.is_not(None),
            func.concat("Span annotation #", handle.span_annotation_id),
        ),
        (
            handle.sentence_annotation_id.is_not(None),
            func.concat("Sentence annotation #", handle.sentence_annotation_id),
        ),
        (
            handle.bbox_annotation_id.is_not(None),
            func.concat("Bounding box annotation #", handle.bbox_annotation_id),
        ),
        (handle.span_group_id.is_not(None), span_group.name),
        else_="Memo attachment",
    )

    return (
        db.query(
            MemoORM.id.label("id"),
            MemoORM.title.label("M_TITLE"),
            MemoORM.icon.label("icon"),
            MemoORM.content.label("M_CONTENT"),
            MemoORM.content_json.label("content_json"),
            MemoORM.user_id.label("M_USER_ID"),
            MemoORM.project_id.label("project_id"),
            MemoORM.created.label("M_CREATED"),
            MemoORM.updated.label("M_UPDATED"),
            attached_object_type_expr.label("M_ATTACHED_OBJECT_TYPE"),
            attached_object_id_expr.label("M_ATTACHED_OBJECT_ID"),
            attached_object_label_expr.label("attached_object_label"),
            case((favorite.memo_id.is_not(None), True), else_=False).label(
                "M_FAVORITE"
            ),
            func.concat(author.first_name, " ", author.last_name).label("author_label"),
        )
        .join(handle, MemoORM.attached_to_id == handle.id)
        .join(author, author.id == MemoORM.user_id)
        .outerjoin(span_group, span_group.id == handle.span_group_id)
        .outerjoin(source_document, source_document.id == handle.source_document_id)
        .outerjoin(code, code.id == handle.code_id)
        .outerjoin(tag, tag.id == handle.tag_id)
        .outerjoin(project, project.id == handle.project_id)
        .outerjoin(
            favorite,
            and_(favorite.memo_id == MemoORM.id, favorite.user_id == user_id),
        )
        .filter(MemoORM.project_id == project_id)
    )


class MemoColumns(str, AbstractColumns):
    TITLE = "M_TITLE"
    CONTENT = "M_CONTENT"
    USER_ID = "M_USER_ID"
    ATTACHED_OBJECT_TYPE = "M_ATTACHED_OBJECT_TYPE"
    ATTACHED_OBJECT_ID = "M_ATTACHED_OBJECT_ID"
    CREATED = "M_CREATED"
    UPDATED = "M_UPDATED"
    FAVORITE = "M_FAVORITE"

    def get_filter_column(self, subquery_dict):
        match self:
            # ATTACHED_OBJECT filters on the (type, id) pair: the raw id alone is
            # meaningless because ids collide across entity types.
            case MemoColumns.ATTACHED_OBJECT_ID:
                return (
                    subquery_dict[MemoColumns.ATTACHED_OBJECT_TYPE.value],
                    subquery_dict[self.value],
                )
            case (
                MemoColumns.TITLE
                | MemoColumns.CONTENT
                | MemoColumns.USER_ID
                | MemoColumns.ATTACHED_OBJECT_TYPE
                | MemoColumns.CREATED
                | MemoColumns.UPDATED
                | MemoColumns.FAVORITE
            ):
                return subquery_dict[self.value]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case MemoColumns.TITLE:
                return FilterOperator.STRING
            case MemoColumns.CONTENT:
                return FilterOperator.STRING
            case MemoColumns.USER_ID:
                return FilterOperator.ID
            case MemoColumns.ATTACHED_OBJECT_TYPE:
                return FilterOperator.ATTACHED_OBJECT_TYPE
            case MemoColumns.ATTACHED_OBJECT_ID:
                return FilterOperator.ATTACHED_OBJECT
            case MemoColumns.CREATED:
                return FilterOperator.DATE
            case MemoColumns.UPDATED:
                return FilterOperator.DATE
            case MemoColumns.FAVORITE:
                return FilterOperator.BOOLEAN

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case MemoColumns.ATTACHED_OBJECT_TYPE:
                return FilterValueType.ATTACHED_OBJECT_TYPE
            case MemoColumns.ATTACHED_OBJECT_ID:
                return FilterValueType.ATTACHED_OBJECT
            case MemoColumns.USER_ID:
                return FilterValueType.USER_ID
            case (
                MemoColumns.TITLE
                | MemoColumns.CONTENT
                | MemoColumns.CREATED
                | MemoColumns.UPDATED
                | MemoColumns.FAVORITE
            ):
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self, subquery_dict=None):
        # Sort against the projection subquery columns. Contextual columns sort
        # by their human-readable label rather than the raw id.
        if subquery_dict is None:
            # Sortability probe (column_info): all memo columns are sortable.
            return MemoORM.id
        match self:
            case MemoColumns.USER_ID:
                return subquery_dict["author_label"]
            case MemoColumns.ATTACHED_OBJECT_ID:
                return subquery_dict["attached_object_label"]
            case (
                MemoColumns.TITLE
                | MemoColumns.CONTENT
                | MemoColumns.ATTACHED_OBJECT_TYPE
                | MemoColumns.CREATED
                | MemoColumns.UPDATED
                | MemoColumns.FAVORITE
            ):
                return subquery_dict[self.value]

    def get_label(self) -> str:
        match self:
            case MemoColumns.TITLE:
                return "Title"
            case MemoColumns.CONTENT:
                return "Content"
            case MemoColumns.USER_ID:
                return "Author"
            case MemoColumns.ATTACHED_OBJECT_TYPE:
                return "Attached object type"
            case MemoColumns.ATTACHED_OBJECT_ID:
                return "Attached object"
            case MemoColumns.CREATED:
                return "Created"
            case MemoColumns.UPDATED:
                return "Updated"
            case MemoColumns.FAVORITE:
                return "Favorite"

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        pass

    def get_group_expressions(
        self, subquery_dict, date_granularity: DateGranularity | None
    ) -> GroupExpressions | None:
        columns = subquery_dict
        target_id = None
        target_type = None

        match self:
            case MemoColumns.TITLE:
                initial = func.upper(func.substr(columns[self.value], 1, 1))
                key = case((initial.op("~")("^[A-Z]$"), initial), else_="#")
                label = key
            case MemoColumns.USER_ID:
                key = cast(columns[self.value], String)
                label = columns.author_label
            case MemoColumns.ATTACHED_OBJECT_TYPE:
                key = columns[self.value]
                label = func.replace(key, "_", " ")
            case MemoColumns.ATTACHED_OBJECT_ID:
                key = func.concat(
                    columns[MemoColumns.ATTACHED_OBJECT_TYPE.value],
                    ":",
                    columns[self.value],
                )
                label = columns.attached_object_label
                target_id = columns[self.value]
                target_type = columns[MemoColumns.ATTACHED_OBJECT_TYPE.value]
            case MemoColumns.CREATED | MemoColumns.UPDATED:
                granularity = date_granularity or DateGranularity.MONTH
                truncated = func.date_trunc(granularity.value, columns[self.value])
                key = cast(truncated, String)
                formats = {
                    DateGranularity.DAY: "YYYY-MM-DD",
                    DateGranularity.WEEK: 'IYYY-"W"IW',
                    DateGranularity.MONTH: "YYYY-MM",
                    DateGranularity.YEAR: "YYYY",
                }
                label = func.to_char(truncated, formats[granularity])
            case MemoColumns.FAVORITE:
                key = cast(columns[self.value], String)
                label = case(
                    (columns[self.value].is_(True), "Favorites"),
                    else_="Not favorites",
                )
            case MemoColumns.CONTENT:
                # CONTENT is free text and not a useful partition key.
                return None

        missing_labels = {
            MemoColumns.ATTACHED_OBJECT_ID: "No attached object",
            MemoColumns.USER_ID: "No author",
        }
        key = func.coalesce(key, NONE_GROUP_KEY)
        label = func.coalesce(label, missing_labels.get(self, "Other"))
        return GroupExpressions(
            key=key, label=label, target_id=target_id, target_type=target_type
        )

    def is_groupable(self) -> bool:
        match self:
            case MemoColumns.CONTENT:
                return False
            case (
                MemoColumns.TITLE
                | MemoColumns.USER_ID
                | MemoColumns.ATTACHED_OBJECT_TYPE
                | MemoColumns.ATTACHED_OBJECT_ID
                | MemoColumns.CREATED
                | MemoColumns.UPDATED
                | MemoColumns.FAVORITE
            ):
                return True
            case _:
                raise NotImplementedError(f"Cannot determine groupability for {self}!")  # type: ignore

    def resolve_ids(
        self, db, ids: list[int], types: list[Crud] | None = None
    ) -> list[str]:
        match self:
            case MemoColumns.ATTACHED_OBJECT_ID:
                assert types is not None and len(types) == len(ids), (
                    "ATTACHED_OBJECT resolution requires the entity type per id"
                )
                return [
                    self._resolve_attached_object_name(db, crud, i)
                    for crud, i in zip(types, ids)
                ]
            case MemoColumns.USER_ID:
                users = crud_user.read_by_ids(db, ids=ids)
                return [user.email for user in users]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    @staticmethod
    def _resolve_attached_object_name(db, crud: Crud, object_id: int) -> str:
        match crud:
            case Crud.SOURCE_DOCUMENT | Crud.CODE | Crud.TAG | Crud.SPAN_GROUP:
                return crud.value.read(db, object_id).name
            case Crud.PROJECT:
                return crud.value.read(db, object_id).title
            case Crud.SPAN_ANNOTATION | Crud.SENTENCE_ANNOTATION | Crud.BBOX_ANNOTATION:
                return str(object_id)
            case _:
                raise NotImplementedError(f"Cannot resolve name for {crud}!")

    def resolve_names(
        self, db, project_id: int, names: list[str], types: list[Crud] | None = None
    ) -> list[int]:
        match self:
            case MemoColumns.ATTACHED_OBJECT_ID:
                assert types is not None and len(types) == len(names), (
                    "ATTACHED_OBJECT resolution requires the entity type per name"
                )
                return [
                    self._resolve_attached_object_id(db, project_id, crud, name)
                    for crud, name in zip(types, names)
                ]
            case MemoColumns.USER_ID:
                users = crud_user.read_by_emails(db, emails=names)
                return [user.id for user in users]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")

    @staticmethod
    def _resolve_attached_object_id(db, project_id: int, crud: Crud, name: str) -> int:
        match crud:
            case Crud.SPAN_ANNOTATION | Crud.SENTENCE_ANNOTATION | Crud.BBOX_ANNOTATION:
                # Annotations have no name; they round-trip by their stringified id.
                return int(name)
            case Crud.SOURCE_DOCUMENT:
                found = crud.value.read_by_name(db, name=name, proj_id=project_id)  # type: ignore
            case Crud.CODE:
                found = crud.value.read_by_name_and_project(
                    db, code_name=name, proj_id=project_id
                )  # type: ignore
            case Crud.TAG:
                found = crud.value.read_by_name_and_project(
                    db, name=name, project_id=project_id
                )  # type: ignore
            case Crud.PROJECT:
                found = crud.value.read_by_title(db, title=name)  # type: ignore
            case Crud.SPAN_GROUP:
                found = crud.value.read_by_name(db, name=name)  # type: ignore
            case _:
                raise NotImplementedError(f"Cannot resolve id for {crud}!")
        if found is None:
            raise ValueError(f"No {crud.name} named '{name}' in project {project_id}!")
        return found.id
