"""The artefact `audio`, the audio stream: the uploaded file of an audio
document, extracted from a video; with the archive of its file."""

from collections.abc import Mapping

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.doc_processing.video_utils import extract_audio_stream
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_registry import ArtefactArchive, artefact
from systems.artefact_system.artefact_system_enum import StorageKind


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
            FilesystemRepo().get_path_to_sdoc_file(
                SourceDocumentRead.model_validate(sdoc)
            )
        )


AUDIO = artefact(
    "audio",
    kind=StorageKind.OWN_STORE,
    always=True,
    uploaded_for={DocType.audio},
    archive=_AudioArchive(),
)
