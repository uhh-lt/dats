from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM


class SourceDocumentLinkORM(ORMBase):
    id = mapped_column(Integer, primary_key=True, index=True)
    # we cannot use the parent and linked id as PK because we do not know the linked id before the linked sdoc is
    # in the db, which might occur after the parent (especially for large imports)
    parent_source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), index=True
    )
    parent_source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        viewonly=True,
        foreign_keys="sourcedocumentlink.c.parent_source_document_id",
    )

    linked_source_document_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        index=True,
    )
    linked_source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        viewonly=True,
        foreign_keys="sourcedocumentlink.c.linked_source_document_id",
    )

    linked_source_document_filename: Mapped[Optional[str]] = mapped_column(
        String, index=True
    )
