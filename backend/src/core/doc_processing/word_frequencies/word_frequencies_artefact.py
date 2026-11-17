"""The artefact `word_frequencies`, computed on demand and read by several
features, with the archive of its table."""

from collections.abc import Mapping

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from core.doc.source_document_orm import SourceDocumentORM
from core.doc_processing.word_frequencies.word_frequency_crud import (
    crud_word_frequency,
)
from core.doc_processing.word_frequencies.word_frequency_dto import (
    WordFrequencyCreate,
)
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact

_WORD_FREQUENCIES = TypeAdapter(list[tuple[str, int]])


class _WordFrequencyArchive(ArtefactArchive):
    """The `word_frequencies` column, from the word frequency table."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {
            "word_frequencies": [(wf.word, wf.count) for wf in sdoc.word_frequencies]
        }

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        crud_word_frequency.create_multi(
            db=db,
            create_dtos=[
                WordFrequencyCreate(sdoc_id=sdoc.id, word=word, count=count)
                for word, count in _WORD_FREQUENCIES.validate_python(
                    archived["word_frequencies"]
                )
            ],
        )


WORD_FREQUENCIES = artefact("word_frequencies", archive=_WordFrequencyArchive())
