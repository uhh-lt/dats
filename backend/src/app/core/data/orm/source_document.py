from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document_link import SourceDocumentLinkORM
    from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM


# class ProxiedDictMixin(object):
#     """Adds obj[key] access to a mapped class.

#     This class basically proxies dictionary access to an attribute
#     called ``_proxied``.  The class which inherits this class
#     should have an attribute called ``_proxied`` which points to a dictionary.

#     """

#     def __len__(self):
#         return len(self._proxied)

#     def __iter__(self):
#         return iter(self._proxied)

#     def __getitem__(self, key):
#         return self._proxied[key]

#     def __contains__(self, key):
#         return key in self._proxied

#     def __setitem__(self, key, value):
#         self._proxied[key] = value

#     def __delitem__(self, key):
#         del self._proxied[key]


# class SourceDocumentORM(ProxiedDictMixin, ORMBase):
class SourceDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="source_document",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="source_documents"
    )

    # one to many
    metadata_: Mapped[List["SourceDocumentMetadataORM"]] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="source_document",
        passive_deletes=True,
    )

    annotation_documents: Mapped[List["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM", back_populates="source_document", passive_deletes=True
    )

    source_document_links: Mapped[List["SourceDocumentLinkORM"]] = relationship(
        "SourceDocumentLinkORM",
        back_populates="parent_source_document",
        passive_deletes=True,
        foreign_keys="sourcedocumentlink.c.parent_source_document_id",
    )

    # many to many
    document_tags: Mapped[List["DocumentTagORM"]] = relationship(
        "DocumentTagORM",
        secondary="SourceDocumentDocumentTagLinkTable".lower(),
        back_populates="source_documents",
        passive_deletes=True,
    )
    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )

    @property
    def tokens(self):
        return [self.content[s:e] for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def token_character_offsets(self):
        return [(s, e) for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def sentences(self):
        return [
            self.content[s:e] for s, e in zip(self.sentence_starts, self.sentence_ends)
        ]

    @property
    def sentence_character_offsets(self):
        return [(s, e) for s, e in zip(self.sentence_starts, self.sentence_ends)]
