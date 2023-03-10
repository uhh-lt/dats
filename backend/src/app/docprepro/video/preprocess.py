from pathlib import Path
from typing import List

from loguru import logger

from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.video.import_video_document import import_video_document_
from app.docprepro.video.models.preprovideodoc import PreProVideoDoc
from config import conf

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
# torch.set_num_threads(1)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_video_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProVideoDoc]:
    return import_video_document_(doc_file_path, project_id, mime_type)
