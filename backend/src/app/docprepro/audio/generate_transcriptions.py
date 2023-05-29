from typing import List

from tqdm import tqdm
import numpy as np
from scipy.io import wavfile
from whisper_timestamped import Whisper

from app.core.data.dto.source_document import SDocStatus
from app.core.db.sql_service import SQLService
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.audio.models.wordleveltranscription import WordLevelTranscription
from app.docprepro.util import update_sdoc_status
from config import conf


sql = SQLService(echo=False)

OPTIONS = conf.docprepro.audio.whisper.options


def generate_transcriptions_(
    ppads: List[PreProAudioDoc], whisper: Whisper, whisper_model: Whisper
) -> List[PreProAudioDoc]:
    for ppad in tqdm(ppads, desc="Generating transcriptions"):
        update_sdoc_status(
            sdoc_id=ppad.sdoc_id,
            sdoc_status=SDocStatus.generate_transcription,
        )
        wav_file = str(ppad.uncompressed_fn)

        # Load uncompressed audiofile
        audiodata = wavfile.read(wav_file)[1]

        audionp = (
            np.frombuffer(audiodata, np.int16).flatten().astype(np.float32) / 32768.0
        )

        transcribe_options = dict(task="transcribe", **OPTIONS)

        # Transcribe with whisper timestamped #TODO: Test with WhisperX pending
        result = whisper.transcribe(whisper_model, audionp, **transcribe_options)

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
