from functools import lru_cache
import os
from typing import List

from loguru import logger
import numpy as np
from scipy.io import wavfile
import torch
from tqdm import tqdm
import whisper_timestamped

from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.audio.models.wordleveltranscription import WordLevelTranscription
from app.docprepro.util import update_sdoc_status
from config import conf


sql = SQLService(echo=False)


torch.set_num_threads(1)


@lru_cache(maxsize=1)
def load_whisper_model() -> whisper_timestamped.Whisper:
    logger.debug("Loading whisper Model")
    WHISPER_MODEL = conf.docprepro.audio.whisper.model
    DEVICE = conf.docprepro.audio.whisper.device
    DOWNLOAD_DIR = os.environ["TRANSFORMERS_CACHE"]
    whisper_model = whisper_timestamped.load_model(
        WHISPER_MODEL, DEVICE, download_root=DOWNLOAD_DIR
    )
    return whisper_model


def generate_word_level_transcriptions_(
    ppads: List[PreProAudioDoc]
) -> List[PreProAudioDoc]:
    whisper_model = load_whisper_model()
    for ppad in tqdm(ppads, desc="Generating transcriptions"):
        update_sdoc_status(
            sdoc_id=ppad.sdoc_id,
            sdoc_status=SDocStatus.generate_word_level_transcriptions,
        )
        wav_file = str(ppad.uncompressed_fn)

        # Load uncompressed audiofile
        audiodata = wavfile.read(wav_file)[1]

        audionp = (
            np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0
        )

        WHISPER_TRANSCRIBE_OPTIONS = conf.docprepro.audio.whisper.options
        transcribe_options = dict(task="transcribe", **WHISPER_TRANSCRIBE_OPTIONS)

        # Transcribe with whisper timestamped #TODO: Test with WhisperX pending
        result = whisper_timestamped.transcribe(
            whisper_model, audionp, **transcribe_options
        )

        # Create Wordlevel Transcriptions
        for segment in result["segments"]:
            for word in segment["words"]:
                wlt = WordLevelTranscription(
                    sdoc_id=ppad.sdoc_id,
                    text=word["text"],
                    start_ms=int(word["start"] * 1000),
                    end_ms=int(word["end"] * 1000),
                )
                ppad.word_level_transcriptions.append(wlt)

    return ppads


def store_word_level_transcriptions(
    ppads: List[PreProAudioDoc],
) -> List[PreProAudioDoc]:
    pass
    return ppads
