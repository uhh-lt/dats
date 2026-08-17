from sqlalchemy import String, and_, case, cast, func
from sqlalchemy.orm import Query, Session, aliased

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM
from core.memo.memo_query_dto import (
    MemoContextReference,
    MemoGroupPage,
    MemoGroupQueryRequest,
    MemoGroupSummary,
    MemoGroupTarget,
    MemoObjectReference,
    MemoPage,
    MemoQueryRequest,
    MemoSummary,
)
from core.memo.memo_view_dto import MemoDateGranularity, MemoGroupBy, MemoGroupConfig
from core.memo.object_handle_orm import ObjectHandleORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from core.user.user_orm import UserORM
from modules.search.memo_search.memo_search_columns import MemoColumns
from systems.search_system.filtering import Filter, FilterExpression

NONE_GROUP_KEY = "__none__"


def _build_projection(db: Session, *, project_id: int, user_id: int) -> Query:
    handle = aliased(ObjectHandleORM)
    span = aliased(SpanAnnotationORM)
    sentence = aliased(SentenceAnnotationORM)
    bbox = aliased(BBoxAnnotationORM)
    span_group = aliased(SpanGroupORM)
    span_doc = aliased(AnnotationDocumentORM)
    sentence_doc = aliased(AnnotationDocumentORM)
    bbox_doc = aliased(AnnotationDocumentORM)
    group_doc = aliased(AnnotationDocumentORM)
    source_context = aliased(SourceDocumentORM)
    code_context = aliased(CodeORM)
    tag = aliased(TagORM)
    project = aliased(ProjectORM)
    author = aliased(UserORM)
    favorite = aliased(MemoFavoriteLinkTable)

    source_document_id = func.coalesce(
        handle.source_document_id,
        span_doc.source_document_id,
        sentence_doc.source_document_id,
        bbox_doc.source_document_id,
        group_doc.source_document_id,
    )
    code_id = func.coalesce(
        handle.code_id,
        span.code_id,
        sentence.code_id,
        bbox.code_id,
    )
    attached_object_id = func.coalesce(
        handle.source_document_id,
        handle.code_id,
        handle.tag_id,
        handle.project_id,
        handle.span_annotation_id,
        handle.sentence_annotation_id,
        handle.bbox_annotation_id,
        handle.span_group_id,
    )
    attached_object_type = case(
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
    attached_object_label = case(
        (handle.source_document_id.is_not(None), source_context.name),
        (handle.code_id.is_not(None), code_context.name),
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
            MemoORM.title.label(MemoColumns.TITLE.value),
            MemoORM.icon.label("icon"),
            MemoORM.content.label(MemoColumns.CONTENT.value),
            MemoORM.user_id.label(MemoColumns.USER_ID.value),
            MemoORM.project_id.label("project_id"),
            MemoORM.created.label(MemoColumns.CREATED.value),
            MemoORM.updated.label(MemoColumns.UPDATED.value),
            attached_object_type.label(MemoColumns.ATTACHED_OBJECT_TYPE.value),
            attached_object_id.label(MemoColumns.ATTACHED_OBJECT_ID.value),
            attached_object_label.label("attached_object_label"),
            source_document_id.label(MemoColumns.SOURCE_DOCUMENT_ID.value),
            source_context.name.label("source_document_label"),
            code_id.label(MemoColumns.CODE_ID.value),
            code_context.name.label("code_label"),
            case((favorite.memo_id.is_not(None), True), else_=False).label(
                MemoColumns.FAVORITE.value
            ),
            func.concat(author.first_name, " ", author.last_name).label("author_label"),
        )
        .join(handle, MemoORM.attached_to_id == handle.id)
        .join(author, author.id == MemoORM.user_id)
        .outerjoin(span, span.id == handle.span_annotation_id)
        .outerjoin(sentence, sentence.id == handle.sentence_annotation_id)
        .outerjoin(bbox, bbox.id == handle.bbox_annotation_id)
        .outerjoin(span_group, span_group.id == handle.span_group_id)
        .outerjoin(span_doc, span_doc.id == span.annotation_document_id)
        .outerjoin(sentence_doc, sentence_doc.id == sentence.annotation_document_id)
        .outerjoin(bbox_doc, bbox_doc.id == bbox.annotation_document_id)
        .outerjoin(group_doc, group_doc.id == span_group.annotation_document_id)
        .outerjoin(source_context, source_context.id == source_document_id)
        .outerjoin(code_context, code_context.id == code_id)
        .outerjoin(tag, tag.id == handle.tag_id)
        .outerjoin(project, project.id == handle.project_id)
        .outerjoin(
            favorite,
            and_(favorite.memo_id == MemoORM.id, favorite.user_id == user_id),
        )
        .filter(MemoORM.project_id == project_id)
    )


def _filter_expression(expression: FilterExpression, columns):
    if isinstance(expression.column, int):
        raise ValueError("Project metadata columns are not supported for Memo views")
    column = columns[expression.column.value]
    return expression.operator.apply(column, expression.value)


def _filter_tree(filter_: Filter, columns):
    conditions = []
    for item in filter_.items:
        if isinstance(item, FilterExpression):
            conditions.append(_filter_expression(item, columns))
        else:
            conditions.append(_filter_tree(item, columns))
    return filter_.logic_operator.get_sqlalchemy_operator()(*conditions)


def _apply_search(
    db: Session,
    *,
    query: Query,
    columns,
    project_id: int,
    search_query: str,
) -> Query:
    normalized_query = search_query.strip()
    if normalized_query == "":
        return query

    pattern = f"%{normalized_query}%"
    return query.filter(
        columns[MemoColumns.TITLE.value].ilike(pattern)
        | columns[MemoColumns.CONTENT.value].ilike(pattern)
    )


def _base_filtered_query(
    db: Session,
    *,
    project_id: int,
    user_id: int,
    filters: Filter[MemoColumns],
    search_query: str,
):
    projection = _build_projection(
        db, project_id=project_id, user_id=user_id
    ).subquery()
    query = db.query(*projection.c).filter(_filter_tree(filters, projection.c))
    query = _apply_search(
        db,
        query=query,
        columns=projection.c,
        project_id=project_id,
        search_query=search_query,
    )
    return projection, query


def _group_columns(columns, group: MemoGroupConfig):
    field = group.field
    target_id = None
    target_type = None

    if field == MemoGroupBy.TITLE:
        initial = func.upper(func.substr(columns[MemoColumns.TITLE.value], 1, 1))
        key = case((initial.op("~")("^[A-Z]$"), initial), else_="#")
        label = key
    elif field == MemoGroupBy.AUTHOR:
        key = cast(columns[MemoColumns.USER_ID.value], String)
        label = columns.author_label
    elif field == MemoGroupBy.ATTACHED_OBJECT_TYPE:
        key = columns[MemoColumns.ATTACHED_OBJECT_TYPE.value]
        label = func.replace(key, "_", " ")
    elif field == MemoGroupBy.ATTACHED_OBJECT:
        key = func.concat(
            columns[MemoColumns.ATTACHED_OBJECT_TYPE.value],
            ":",
            columns[MemoColumns.ATTACHED_OBJECT_ID.value],
        )
        label = columns.attached_object_label
        target_id = columns[MemoColumns.ATTACHED_OBJECT_ID.value]
        target_type = columns[MemoColumns.ATTACHED_OBJECT_TYPE.value]
    elif field == MemoGroupBy.SOURCE_DOCUMENT:
        key = cast(columns[MemoColumns.SOURCE_DOCUMENT_ID.value], String)
        label = columns.source_document_label
        target_id = columns[MemoColumns.SOURCE_DOCUMENT_ID.value]
        target_type = AttachedObjectType.source_document.value
    elif field == MemoGroupBy.CODE:
        key = cast(columns[MemoColumns.CODE_ID.value], String)
        label = columns.code_label
        target_id = columns[MemoColumns.CODE_ID.value]
        target_type = AttachedObjectType.code.value
    elif field in {MemoGroupBy.CREATED, MemoGroupBy.UPDATED}:
        column_name = (
            MemoColumns.CREATED.value
            if field == MemoGroupBy.CREATED
            else MemoColumns.UPDATED.value
        )
        granularity = group.date_granularity or MemoDateGranularity.MONTH
        truncated = func.date_trunc(granularity.value, columns[column_name])
        key = cast(truncated, String)
        formats = {
            MemoDateGranularity.DAY: "YYYY-MM-DD",
            MemoDateGranularity.WEEK: 'IYYY-"W"IW',
            MemoDateGranularity.MONTH: "YYYY-MM",
            MemoDateGranularity.YEAR: "YYYY",
        }
        label = func.to_char(truncated, formats[granularity])
    else:
        key = cast(columns[MemoColumns.FAVORITE.value], String)
        label = case(
            (columns[MemoColumns.FAVORITE.value].is_(True), "Favorites"),
            else_="Not favorites",
        )

    missing_labels = {
        MemoGroupBy.SOURCE_DOCUMENT: "No source document",
        MemoGroupBy.CODE: "No code",
        MemoGroupBy.ATTACHED_OBJECT: "No attached object",
        MemoGroupBy.AUTHOR: "No author",
    }
    key = func.coalesce(key, NONE_GROUP_KEY)
    label = func.coalesce(label, missing_labels.get(field, "Other"))
    return key, label, target_id, target_type


def _to_summary(row) -> MemoSummary:
    data = row._mapping
    source_document = None
    if data[MemoColumns.SOURCE_DOCUMENT_ID.value] is not None:
        source_document = MemoContextReference(
            id=data[MemoColumns.SOURCE_DOCUMENT_ID.value],
            label=data["source_document_label"],
        )
    code = None
    if data[MemoColumns.CODE_ID.value] is not None:
        code = MemoContextReference(
            id=data[MemoColumns.CODE_ID.value],
            label=data["code_label"],
        )
    return MemoSummary(
        id=data["id"],
        title=data[MemoColumns.TITLE.value],
        icon=data["icon"],
        content_excerpt=data[MemoColumns.CONTENT.value][:240],
        user_id=data[MemoColumns.USER_ID.value],
        project_id=data["project_id"],
        created=data[MemoColumns.CREATED.value],
        updated=data[MemoColumns.UPDATED.value],
        is_favorite=data[MemoColumns.FAVORITE.value],
        attached_object=MemoObjectReference(
            id=data[MemoColumns.ATTACHED_OBJECT_ID.value],
            type=AttachedObjectType(data[MemoColumns.ATTACHED_OBJECT_TYPE.value]),
            label=data["attached_object_label"],
        ),
        source_document=source_document,
        code=code,
    )


def query_memos(db: Session, *, request: MemoQueryRequest, user_id: int) -> MemoPage:
    columns, query = _base_filtered_query(
        db,
        project_id=request.project_id,
        user_id=user_id,
        filters=request.filters,
        search_query=request.search_query,
    )
    if request.group_by is not None:
        group_key, _, _, _ = _group_columns(columns.c, request.group_by)
        if request.group_key is not None:
            query = query.filter(group_key == request.group_key)
        query = query.order_by(
            case((group_key == NONE_GROUP_KEY, 1), else_=0).asc(),
            group_key.asc(),
        )

    if request.sort_by is None:
        query = query.order_by(
            columns.c[MemoColumns.UPDATED.value].desc(), columns.c.id.desc()
        )
    else:
        contextual_sort_columns = {
            MemoColumns.USER_ID: columns.c.author_label,
            MemoColumns.ATTACHED_OBJECT_ID: columns.c.attached_object_label,
            MemoColumns.SOURCE_DOCUMENT_ID: columns.c.source_document_label,
            MemoColumns.CODE_ID: columns.c.code_label,
        }
        sort_column = contextual_sort_columns.get(
            request.sort_by.column,
            columns.c[request.sort_by.column.value],
        )
        query = query.order_by(
            request.sort_by.direction.apply(sort_column),  # pyright: ignore[reportArgumentType]
            columns.c.id.desc(),
        )

    total_results = query.count()
    rows = (
        query.offset(request.page_number * request.page_size)
        .limit(request.page_size)
        .all()
    )
    return MemoPage(
        items=[_to_summary(row) for row in rows], total_results=total_results
    )


def query_memo_groups(
    db: Session, *, request: MemoGroupQueryRequest, user_id: int
) -> MemoGroupPage:
    columns, base_query = _base_filtered_query(
        db,
        project_id=request.project_id,
        user_id=user_id,
        filters=request.filters,
        search_query=request.search_query,
    )
    group_key, group_label, target_id, target_type = _group_columns(
        columns.c, request.group_by
    )
    selected = [
        group_key.label("group_key"),
        group_label.label("group_label"),
        func.count(columns.c.id).label("total_results"),
    ]
    grouped_columns = [group_key, group_label]
    if target_id is not None:
        selected.append(target_id.label("target_id"))
        grouped_columns.append(target_id)
    if target_type is not None and not isinstance(target_type, str):
        selected.append(target_type.label("target_type"))
        grouped_columns.append(target_type)

    query = base_query.with_entities(*selected).group_by(*grouped_columns)
    missing_group = case((group_key == NONE_GROUP_KEY, 1), else_=0)
    if request.group_by.field in {MemoGroupBy.CREATED, MemoGroupBy.UPDATED}:
        query = query.order_by(missing_group.asc(), group_key.desc())
    else:
        query = query.order_by(missing_group.asc(), group_label.asc())

    total_results = query.count()
    rows = (
        query.offset(request.page_number * request.page_size)
        .limit(request.page_size)
        .all()
    )
    groups = []
    for row in rows:
        data = row._mapping
        target = None
        resolved_target_id = data.get("target_id")
        if resolved_target_id is not None:
            resolved_target_type = (
                target_type if isinstance(target_type, str) else data.get("target_type")
            )
            target = MemoGroupTarget(
                id=resolved_target_id,
                type=AttachedObjectType(resolved_target_type),
            )
        groups.append(
            MemoGroupSummary(
                key=data["group_key"],
                label=data["group_label"],
                total_results=data["total_results"],
                target=target,
            )
        )
    return MemoGroupPage(items=groups, total_results=total_results)
