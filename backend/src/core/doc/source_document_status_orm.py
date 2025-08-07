from typing import TYPE_CHECKING

from repos.db.orm_base import ORMBase
from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


class SourceDocumentStatusORM(ORMBase):
    id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship("SourceDocumentORM")
    spacy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    es_index: Mapped[bool] = mapped_column(Boolean, nullable=False)
    lang_detect: Mapped[bool] = mapped_column(Boolean, nullable=False)
    html_mapping: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
