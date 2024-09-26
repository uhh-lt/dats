from typing import List, Optional

from sqlalchemy import Integer, func
from sqlalchemy.dialects.postgresql import ARRAY, array_agg
from sqlalchemy.orm import InstrumentedAttribute

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    AnnotatedImageResult,
    BBoxAnnotationTableRow,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting

repo_service = RepoService()


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class AnnotatedImagesColumns(str, AbstractColumns):
    CODE_ID = "AIC_CODE_ID"
    MEMO_CONTENT = "AIC_MEMO_CONTENT"
    SOURCE_DOCUMENT_FILENAME = "AIC_SOURCE_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "AIC_DOCUMENT_DOCUMENT_TAG_ID_LIST"

    def get_filter_column(self, **kwargs):
        match self:
            case AnnotatedImagesColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST:
                return AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST
            case AnnotatedImagesColumns.CODE_ID:
                return CodeORM.id
            case AnnotatedImagesColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case AnnotatedImagesColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case AnnotatedImagesColumns.CODE_ID:
                return FilterOperator.ID
            case AnnotatedImagesColumns.MEMO_CONTENT:
                return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case AnnotatedImagesColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case AnnotatedImagesColumns.CODE_ID:
                return FilterValueType.CODE_ID
            case AnnotatedImagesColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self, **kwargs):
        match self:
            case AnnotatedImagesColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case AnnotatedImagesColumns.CODE_ID:
                return CodeORM.name
            case AnnotatedImagesColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_label(self) -> str:
        match self:
            case AnnotatedImagesColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case AnnotatedImagesColumns.CODE_ID:
                return "Code"
            case AnnotatedImagesColumns.MEMO_CONTENT:
                return "Memo content"


def find_annotated_images_info(
    project_id,
) -> List[ColumnInfo[AnnotatedImagesColumns]]:
    with SQLService().db_session() as db:
        metadata_column_info = crud_project_meta.create_metadata_column_info(
            db=db, project_id=project_id, allowed_doctypes=[DocType.image]
        )

    return [
        ColumnInfo[AnnotatedImagesColumns].from_column(column)
        for column in AnnotatedImagesColumns
    ] + metadata_column_info


def find_annotated_images(
    project_id: int,
    user_id: int,
    filter: Filter[AnnotatedImagesColumns],
    sorts: List[Sort[AnnotatedImagesColumns]],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> AnnotatedImageResult:
    with SQLService().db_session() as db:
        tag_ids_agg = aggregate_ids(
            DocumentTagORM.id, label=AnnotatedImagesColumns.DOCUMENT_TAG_ID_LIST
        )

        # subquery of all memo ids for BBoxAnnotations by user_id
        memo_subquery = (
            db.query(
                BBoxAnnotationORM.id.label("bbox_annotation_id"),
                MemoORM.id.label("memo_id"),
            )
            .join(BBoxAnnotationORM.annotation_document)
            .join(BBoxAnnotationORM.object_handle)
            .join(ObjectHandleORM.attached_memos)
            .filter(
                MemoORM.project_id == project_id,  # memo is in the correct project
                MemoORM.user_id == user_id,  # i own the memo
                AnnotationDocumentORM.user_id == user_id,  # i own the annotation
            )
            .subquery()
        )

        query = (
            db.query(
                BBoxAnnotationORM,
                SourceDocumentORM.filename,
                tag_ids_agg,
                CodeORM.id,
                MemoORM.content,
            )
            # join BBox Annotation with Source Document
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
            )
            .join(
                SourceDocumentORM,
                SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
            )
            # join Source Document with Document Tag
            .join(SourceDocumentORM.document_tags, isouter=True)
            # join BBox Annotation with Code
            .join(BBoxAnnotationORM.current_code)
            .join(CurrentCodeORM.code)
            # join BBox Annotation with my Memo
            .join(
                memo_subquery,
                BBoxAnnotationORM.id == memo_subquery.c.bbox_annotation_id,
                isouter=True,
            )
            .join(
                MemoORM,
                MemoORM.id == memo_subquery.c.memo_id,
                isouter=True,
            )
            .group_by(
                BBoxAnnotationORM.id,
                SourceDocumentORM.filename,
                CodeORM.id,
                MemoORM.content,
            )
            .filter(
                AnnotationDocumentORM.user_id == user_id,
                SourceDocumentORM.project_id == project_id,
            )
        )

        query = apply_filtering(query=query, filter=filter, db=db)

        query = apply_sorting(query=query, sorts=sorts, db=db)

        if page is not None and page_size is not None:
            query = query.order_by(
                BBoxAnnotationORM.id
            )  # this is very important, otherwise pagination will not work!
            query, pagination = apply_pagination(
                query=query, page_number=page + 1, page_size=page_size
            )
            total_results = pagination.total_results
            result = query.all()
        else:
            result = query.all()
            total_results = len(result)

        return AnnotatedImageResult(
            total_results=total_results,
            data=[
                BBoxAnnotationTableRow(
                    id=row[0].id,
                    x=row[0].x_min,
                    y=row[0].y_min,
                    width=row[0].x_max - row[0].x_min,
                    height=row[0].y_max - row[0].y_min,
                    url=repo_service.get_sdoc_url(
                        sdoc=SourceDocumentRead.model_validate(
                            row[0].annotation_document.source_document
                        ),
                        relative=True,
                        webp=True,
                        thumbnail=False,
                    ),
                    code=CodeRead.model_validate(row[0].current_code.code),
                    user_id=row[0].annotation_document.user_id,
                    sdoc=SourceDocumentRead.model_validate(
                        row[0].annotation_document.source_document
                    ),
                    tags=[
                        DocumentTagRead.model_validate(tag)
                        for tag in row[
                            0
                        ].annotation_document.source_document.document_tags
                    ],
                    memo=None,
                )
                for row in result
            ],
        )
