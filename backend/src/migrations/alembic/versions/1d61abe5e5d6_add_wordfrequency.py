"""Add wordfrequency table & copy data from word_frequencies metadata to the new table

This is a schema migration + data migration
See: https://stackoverflow.com/questions/24612395/how-do-i-execute-inserts-and-updates-in-an-alembic-upgrade-script

Revision ID: 1d61abe5e5d6
Revises: dac9e104b3c2
Create Date: 2023-11-27 09:26:21.487888

"""

import json
from typing import Sequence

from alembic import op
from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    Session,
    declarative_base,
    mapped_column,
    relationship,
)

Base = declarative_base()

# revision identifiers, used by Alembic.
revision: str = "1d61abe5e5d6"
down_revision: str | None = "dac9e104b3c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


class WordFrequency(Base):
    __tablename__ = "wordfrequency"

    sdoc_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    source_document: Mapped["SourceDocument"] = relationship(
        "SourceDocument", back_populates="word_frequencies"
    )

    word: Mapped[str] = mapped_column(String, primary_key=True)
    count: Mapped[int] = mapped_column(Integer)


class SourceDocument(Base):
    __tablename__ = "sourcedocument"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # one to many
    metadata_: Mapped[list["SourceDocumentMetadata"]] = relationship(
        "SourceDocumentMetadata",
        back_populates="source_document",
        passive_deletes=True,
    )

    word_frequencies: Mapped[list["WordFrequency"]] = relationship(
        "WordFrequency",
        back_populates="source_document",
        passive_deletes=True,
    )


class SourceDocumentMetadata(Base):
    __tablename__ = "sourcedocumentmetadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String, nullable=False, index=True)
    value: Mapped[str] = mapped_column(String, index=False)
    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)

    # many to one
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocument"] = relationship(
        "SourceDocument", back_populates="metadata_"
    )


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)

    # create the wordfrequency table
    WordFrequency.__table__.create(bind=bind)

    # copy data from word_frequencies metadata to the new table
    for sdoc_metadata in (
        session.query(SourceDocumentMetadata)
        .filter(SourceDocumentMetadata.key == "word_frequencies")
        .all()
    ):
        word_frequencies = json.loads(sdoc_metadata.value)
        for word, count in word_frequencies.items():
            session.add(
                WordFrequency(
                    sdoc_id=sdoc_metadata.source_document_id, word=word, count=count
                )
            )
        session.delete(sdoc_metadata)

    session.flush()


def downgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)

    # move data from wordfrequency table to word_frequencies metadata
    for sdoc in session.query(SourceDocument):
        if len(sdoc.word_frequencies) == 0:
            continue

        word_frequencies = {wf.word: wf.count for wf in sdoc.word_frequencies}
        session.add(
            SourceDocumentMetadata(
                source_document_id=sdoc.id,
                key="word_frequencies",
                value=json.dumps(word_frequencies),
                read_only=True,
            )
        )

    # delete the wordfrequency table
    op.drop_table("wordfrequency")
