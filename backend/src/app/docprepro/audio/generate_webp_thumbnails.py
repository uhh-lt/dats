import wave
from typing import List

import matplotlib.pyplot as plt
import numpy as np
from app.core.data.dto.source_document import SDocStatus
from app.core.data.repo.repo_service import RepoService
from app.docprepro.audio.models.preproaudiodoc import PreProAudioDoc
from app.docprepro.util import update_sdoc_status
from tqdm import tqdm

repo = RepoService()


def generate_webp_thumbnails_(
    ppads: List[PreProAudioDoc],
) -> List[PreProAudioDoc]:
    for ppad in tqdm(ppads, desc="Generating .webp thumbnails"):
        file_path = ppad.uncompressed_fn
        out_filename = repo.generate_sdoc_filename(
            ppad.audio_dst, webp=True, thumbnail=True
        )
        if not file_path:
            continue

        # read values from wav file
        wav_obj = wave.open(str(file_path), "rb")
        sample_freq = wav_obj.getframerate()
        n_samples = wav_obj.getnframes()
        signal_wave = wav_obj.readframes(n_samples)
        signal_array = np.frombuffer(signal_wave, dtype=np.int16)

        # plot wav file
        times = np.linspace(0, n_samples / sample_freq, num=n_samples)
        plt.figure(figsize=(15, 5))
        plt.plot(times, signal_array, "grey")
        plt.axis("off")
        plt.margins(0, 0)
        plt.savefig(
            str(out_filename), bbox_inches="tight", pad_inches=0, transparent=True
        )

        update_sdoc_status(
            sdoc_id=ppad.sdoc_id,
            sdoc_status=SDocStatus.generate_webp_thumbnails_from_audio,
        )

    return ppads
