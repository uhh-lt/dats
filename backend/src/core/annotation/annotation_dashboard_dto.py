from datetime import datetime

from pydantic import BaseModel

from core.doc.source_document_dto import SourceDocumentRead


class RecentAnnotatedDocument(BaseModel):
    document: SourceDocumentRead
    last_annotated_at: datetime
    annotation_count: int
