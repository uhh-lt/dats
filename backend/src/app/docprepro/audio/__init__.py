from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc

from app.docprepro.text import finish_preprocessing

# Flo: Task names (as they could be imported)
import_audio_document = "app.docprepro.audio.preprocess.import_audio_document"


def audio_document_preprocessing_apply_async(
    doc_file_path: Path, project_id: int, mime_type: str
) -> Any:
    audio_document_preprocessing = Signature(
        import_audio_document,
        kwargs={
            "doc_file_path": doc_file_path,
            "project_id": project_id,
            "mime_type": mime_type,
        },
    ) | Signature(finish_preprocessing)

    return audio_document_preprocessing.apply_async()


def audio_document_preprocessing_without_import_apply_async(
    ppads: List[PreProAudioDoc],
) -> Any:
    raise NotImplementedError
    audio_document_preprocessing = ()
    return audio_document_preprocessing.apply_async()
