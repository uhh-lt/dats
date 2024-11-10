from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import (
    DocumentTagORM,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_utils import aggregate_ids
from app.core.filters.abstract_search_builder import AbstractSearchBuilder
from app.core.search.sdoc_search.sdoc_search_columns import SearchColumns


class SdocSearchBuilder(AbstractSearchBuilder):
    def _add_entity_filter_statements(self, column: SearchColumns):
        match column:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                self._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=SearchColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                self._join_subquery(SourceDocumentORM.document_tags, isouter=True)
            case SearchColumns.CODE_ID_LIST:
                self._add_subquery_column(
                    aggregate_ids(CodeORM.id, label=SearchColumns.CODE_ID_LIST.value)
                )
                self._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                self._join_subquery(
                    SpanAnnotationORM.code,
                    isouter=True,
                )
            case SearchColumns.USER_ID_LIST:
                self._add_subquery_column(
                    aggregate_ids(UserORM.id, SearchColumns.USER_ID_LIST.value)
                )
                self._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                self._join_subquery(
                    AnnotationDocumentORM.user,
                    isouter=True,
                )
            case SearchColumns.SPAN_ANNOTATIONS:
                self._add_subquery_column(
                    cast(
                        array_agg(
                            func.distinct(
                                array([cast(CodeORM.id, String), SpanTextORM.text])
                            ),
                        ),
                        ARRAY(String, dimensions=2),
                    ).label(SearchColumns.SPAN_ANNOTATIONS.value)
                )
                self._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                self._join_subquery(
                    AnnotationDocumentORM.span_annotations,
                    isouter=True,
                )
                self._join_subquery(
                    SpanAnnotationORM.span_text,
                    isouter=True,
                )
                self._join_subquery(
                    SpanAnnotationORM.code,
                    isouter=True,
                )
