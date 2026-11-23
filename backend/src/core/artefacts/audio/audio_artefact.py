"""The artefact `audio`, the audio stream: the uploaded file of an audio
document, extracted from a video; with the archive of its file."""

from collections.abc import Mapping
from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.artefacts.audio.audio_file_crud import AUDIO_FILENAME, crud_audio_file
from core.artefacts.video_utils import extract_audio_stream
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc.source_document_orm import SourceDocumentORM
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact


def audio_stream_path(
    *, project_id: int, sdoc_id: int, doctype: DocType, filename: str
) -> Path:
    """The file of the audio stream: the uploaded file of an audio document
    (`crud_sdoc_file`), the extracted audio of a video (`crud_audio_file`)."""
    if doctype == DocType.video:
        return crud_audio_file.path(
            project_id=project_id, id=sdoc_id, name=AUDIO_FILENAME
        )
    return crud_sdoc_file.path(project_id=project_id, id=sdoc_id, name=filename)


class _AudioArchive(ArtefactArchive):
    """The audio stream. Of a video, it is extracted again from the uploaded
    file with the code of video_audio_extraction; of an audio document, it is the
    uploaded file itself, which no step produces, so the import writes nothing."""

    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        extract_audio_stream(
            project_id=sdoc.project_id,
            sdoc_id=sdoc.id,
            video_path=crud_sdoc_file.path(
                project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
            ),
        )


AUDIO = artefact(
    "audio",
    title="Audio stream",
    always=True,
    uploaded_for={DocType.audio},
    store=crud_audio_file,
    archive=_AudioArchive(),
)
