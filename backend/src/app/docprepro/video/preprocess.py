from pathlib import Path
from typing import List

from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.video.import_video_document import import_video_document_
from app.docprepro.video.generate_webp_thumbnails import generate_webp_thumbnails_
from app.docprepro.video.create_ppad_from_ppvd import create_ppad_from_ppvd_
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.video.models.preprovideodoc import PreProVideoDoc


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_video_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProVideoDoc]:
    return import_video_document_(doc_file_path, project_id, mime_type)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_webp_thumbnails(ppvds: List[PreProVideoDoc]) -> List[PreProVideoDoc]:
    return generate_webp_thumbnails_(ppvds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def create_ppad_from_ppvd(ppvds: List[PreProVideoDoc]) -> List[PreProAudioDoc]:
    return create_ppad_from_ppvd_(ppvds)
