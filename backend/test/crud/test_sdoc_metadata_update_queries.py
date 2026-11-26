"""Updating metadata values in bulk takes a constant number of queries."""

from sqlalchemy.orm import Session

from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataUpdate,
    SourceDocumentMetadataUpdateBulk,
)
from core.metadata.source_document_metadata_service import (
    SourceDocumentMetadataService,
)

from .conftest import ProjectWithNotes, count_queries


def _update_notes(db: Session, project_id: int, note_ids: list[int]) -> int:
    """Set every given note to "updated"; return the query count."""
    db.expire_all()
    update = SourceDocumentMetadataUpdate.with_metatype("string", "updated")
    with count_queries(db) as queries:
        SourceDocumentMetadataService().update_multi(
            db=db,
            project_id=project_id,
            update_dtos=[
                SourceDocumentMetadataUpdateBulk(
                    sdoc_metadata_id=id, **update.model_dump()
                )
                for id in note_ids
            ],
        )
    return queries()


def test_service_update_multi_of_one_key_uses_constant_queries(
    db_session: Session, project_with_notes: ProjectWithNotes
) -> None:
    """Updating nine values of the key "note" takes as many queries as updating
    one: the check for read-only keys loads the key once and finds it in the
    identity map for the other values."""
    project_id = project_with_notes["project_id"]
    note_ids = project_with_notes["note_ids"]

    one_note_queries = _update_notes(db_session, project_id, note_ids[:1])
    nine_notes_queries = _update_notes(db_session, project_id, note_ids[1:])

    assert nine_notes_queries == one_note_queries
