"""Exporting span annotations takes a constant number of queries: the loop over
the annotations finds their code, annotation document and document in the
identity map."""

from pathlib import Path

from sqlalchemy.orm import Session

from modules.eximport.span_annotations.export_span_annotations import (
    export_selected_span_annotations,
)
from sql_test_utils import count_queries

from .conftest import SdocWithSpanAnnotations


def _export(db: Session, out_dir: Path, project_id: int, span_ids: list[int]) -> int:
    """Export the given spans; return the query count."""
    db.expire_all()
    with count_queries(db) as queries:
        export_selected_span_annotations(
            db=db, out_dir=out_dir, project_id=project_id, span_annotation_ids=span_ids
        )
    return queries()


def test_export_of_many_span_annotations_uses_constant_queries(
    db_session: Session,
    sdoc_with_span_annotations: SdocWithSpanAnnotations,
    tmp_path: Path,
) -> None:
    """Exporting 29 spans of one code and one annotation document takes as many
    queries as exporting one."""
    fixture = sdoc_with_span_annotations
    span_ids = fixture["span_ids"]

    one_span_queries = _export(
        db_session, tmp_path, fixture["project_id"], span_ids[:1]
    )
    all_spans_queries = _export(
        db_session, tmp_path, fixture["project_id"], span_ids[1:]
    )

    assert all_spans_queries == one_span_queries
