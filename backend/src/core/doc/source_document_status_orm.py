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

    # TEXT
    spacy: Mapped[bool] = mapped_column(Boolean, nullable=False)
    es_index: Mapped[bool] = mapped_column(Boolean, nullable=False)
    lang_detect: Mapped[bool] = mapped_column(Boolean, nullable=False)
    html_mapping: Mapped[bool] = mapped_column(Boolean, nullable=False)
    html_extraction: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sentence_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # IMAGE
    image_caption: Mapped[bool] = mapped_column(Boolean, nullable=False)
    image_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False)
    image_metadata: Mapped[bool] = mapped_column(Boolean, nullable=False)
    image_thumbnail: Mapped[bool] = mapped_column(Boolean, nullable=False)
    object_detection: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # AUDIO
    audio_metadata: Mapped[bool] = mapped_column(Boolean, nullable=False)
    audio_thumbnail: Mapped[bool] = mapped_column(Boolean, nullable=False)
    transcription: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # VIDEO
    video_metadata: Mapped[bool] = mapped_column(Boolean, nullable=False)
    video_thumbnail: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
