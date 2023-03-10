from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.docprepro.video.models.preprovideodoc import PreProVideoDoc

from app.docprepro.text import finish_preprocessing

# Flo: Task names (as they could be imported)
import_video_document = "app.docprepro.video.preprocess.import_video_document"


def video_document_preprocessing_apply_async(
    doc_file_path: Path, project_id: int, mime_type: str
) -> Any:
    video_document_preprocessing = Signature(
        import_video_document,
        kwargs={
            "doc_file_path": doc_file_path,
            "project_id": project_id,
            "mime_type": mime_type,
        },
    ) | Signature(finish_preprocessing)

    return video_document_preprocessing.apply_async()


def video_document_preprocessing_without_import_apply_async(
    ppvds: List[PreProVideoDoc],
) -> Any:
    raise NotImplementedError
    video_document_preprocessing = ()
    return video_document_preprocessing.apply_async()
