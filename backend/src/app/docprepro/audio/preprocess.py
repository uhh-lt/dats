import os
from pathlib import Path
from typing import List

from app.docprepro.audio.convert_to_pcm import convert_to_pcm_
from app.docprepro.audio.generate_and_import_transcript_file import (
    generate_and_import_transcript_file_,
)
from app.docprepro.audio.generate_webp_thumbnails import generate_webp_thumbnails_
from app.docprepro.audio.generate_word_level_transcriptions import (
    generate_word_level_transcriptions_,
)
from app.docprepro.audio.import_audio_document import import_audio_document_
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.text.models.preprotextdoc import PreProTextDoc


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_audio_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProAudioDoc]:
    return import_audio_document_(doc_file_path, project_id, mime_type)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def convert_to_pcm(ppads: List[PreProAudioDoc]) -> List[PreProAudioDoc]:
    return convert_to_pcm_(ppads)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_word_level_transcriptions(
    ppads: List[PreProAudioDoc],
) -> List[PreProAudioDoc]:
    global whisper_model
    return generate_word_level_transcriptions_(ppads)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_webp_thumbnails(
    ppads: List[PreProAudioDoc],
) -> List[PreProAudioDoc]:
    return generate_webp_thumbnails_(ppads)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_and_import_transcript_file(
    ppads: List[PreProAudioDoc],
) -> List[PreProTextDoc]:
    return generate_and_import_transcript_file_(ppads)
