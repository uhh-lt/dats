from typing import TYPE_CHECKING

from repos.db.orm_base import ORMBase
from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM


# TODO the names of the status must match names in JobType


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
    sdoc_init: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    text_extraction: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    spacy: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    es_index: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    lang_detect: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    html_mapping: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    html_extraction: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    sentence_embedding: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # IMAGE
    image_caption: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    image_embedding: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    image_metadata: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    image_thumbnail: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    object_detection: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # AUDIO
    audio_metadata: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    audio_thumbnail: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    transcription: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    # VIDEO
    video_metadata: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    video_thumbnail: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    video_audio_extraction: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    def get_project_id(self) -> int:
        return self.source_document.get_project_id()
