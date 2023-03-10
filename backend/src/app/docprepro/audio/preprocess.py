from pathlib import Path
from typing import List

from loguru import logger

from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.audio.import_audio_document import import_audio_document_
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from config import conf


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_audio_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProAudioDoc]:
    return import_audio_document_(doc_file_path, project_id, mime_type)
