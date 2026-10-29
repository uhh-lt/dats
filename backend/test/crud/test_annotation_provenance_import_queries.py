"""Importing the provenance of annotation copies takes a constant number of queries."""

from sqlalchemy import event
from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from modules.eximport.annotation_provenance_utils import (
    AnnotationProvenanceExportSchema,
    import_annotation_provenance,
)

from .conftest import SdocWithSpanAnnotations


def _import_provenance(
    db: Session,
    project_id: int,
    copy_ids: list[int],
    source_ids: list[int],
) -> int:
    """Import the provenance "copy i is a copy of source i", where the sources are
    already in the project and not part of the import. Returns the number of
    SELECT statements."""
    copies = crud_span_anno.read_by_ids(db=db, ids=copy_ids)
    sources = crud_span_anno.read_by_ids(db=db, ids=source_ids)

    selects = 0

    def on_execute(conn: object, cursor: object, statement: str, *args: object) -> None:
        nonlocal selects
        if statement.lstrip().upper().startswith("SELECT"):
            selects += 1

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", on_execute)
    try:
        import_annotation_provenance(
            db=db,
            crud=crud_span_anno,
            project_id=project_id,
            provenances=[
                AnnotationProvenanceExportSchema(source_annotation_uuid=source.uuid)
                for source in sources
            ],
            annotations=copies,
        )
    finally:
        event.remove(engine, "before_cursor_execute", on_execute)

    assert [
        copy.source_annotation_id
        for copy in crud_span_anno.read_by_ids(db=db, ids=copy_ids)
    ] == source_ids
    return selects


def test_import_provenance_reads_existing_sources_in_one_query(
    db_session: Session,
    sdoc_with_span_annotations: SdocWithSpanAnnotations,
    project_with_sdoc,
) -> None:
    """Resolving 15 source uuids that are not in the imported file selects as often
    as resolving one: the sources are read with one `uuid IN (...)` query, not one
    query per uuid."""
    project_id = project_with_sdoc["project"].id
    span_ids = sdoc_with_span_annotations["span_ids"]

    one_source_selects = _import_provenance(
        db_session, project_id, span_ids[:1], [span_ids[15]]
    )
    all_sources_selects = _import_provenance(
        db_session, project_id, span_ids[:15], span_ids[15:]
    )

    assert all_sources_selects == one_source_selects
