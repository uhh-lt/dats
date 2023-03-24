from pathlib import Path
from typing import List
import os
import torch

import whisper_timestamped as whisper

from loguru import logger

from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.audio.import_audio_document import import_audio_document_
from app.docprepro.audio.convert_to_pcm import convert_to_pcm_

# from app.docprepro.audio.create_pptd_from_ppad import create_pptd_from_ppad_
from app.docprepro.audio.generate_transcriptions import generate_transcriptions_
from app.docprepro.audio.generate_and_import_transcript_file import (
    generate_and_import_transcript_file_,
)
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from config import conf

torch.set_num_threads(1)

WHISPER_MODEL = conf.docprepro.audio.whisper.model
DEVICE = conf.docprepro.audio.whisper.device
DOWNLOAD_DIR = os.environ["TRANSFORMERS_CACHE"]

logger.debug("Load whisper Model")
whisper_model = whisper.load_model(WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR)


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
def generate_transcriptions(ppads: List[PreProAudioDoc]) -> List[PreProAudioDoc]:
    global whisper
    global whisper_model
    return generate_transcriptions_(ppads, whisper, whisper_model)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_and_import_transcript_file(
    ppads: List[PreProAudioDoc],
) -> List[PreProAudioDoc]:
    return generate_and_import_transcript_file_(ppads)


# @celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
# def create_pptd_from_ppad(ppads: List[PreProAudioDoc]) -> List[PreProTextDoc]:
#     return create_pptd_from_ppad_(ppads)
