import wave

import matplotlib.pyplot as plt
import numpy as np

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

repo = RepoService()


def generate_webp_thumbnail_for_audio(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    if (
        ppad.uncompressed_audio_filepath is None
        or not ppad.uncompressed_audio_filepath.exists()
    ):
        raise FileNotFoundError(
            f"Cannot read uncompressed audio file {str(ppad.uncompressed_audio_filepath)}!"
        )

    thumbnail_filename = repo.generate_sdoc_filename(
        ppad.filepath, webp=True, thumbnail=True
    )

    webp_filename = repo.generate_sdoc_filename(
        ppad.filepath, webp=True, thumbnail=False
    )

    # read values from wav file
    wav_obj = wave.open(str(ppad.uncompressed_audio_filepath), "rb")
    sample_freq = wav_obj.getframerate()
    n_samples = wav_obj.getnframes()
    signal_wave = wav_obj.readframes(n_samples)
    signal_array = np.frombuffer(signal_wave, dtype=np.int16)

    # plot wav file and save as webp
    times = np.linspace(0, n_samples / sample_freq, num=n_samples)
    plt.figure(figsize=(15, 5))
    plt.plot(times, signal_array, "grey")
    plt.axis("off")
    plt.margins(0, 0)
    plt.savefig(
        str(thumbnail_filename), bbox_inches="tight", pad_inches=0, transparent=True
    )

    plt.figure(figsize=(75, 35))
    plt.plot(times, signal_array, "grey")
    plt.axis("off")
    plt.margins(0, 0)
    plt.savefig(str(webp_filename), bbox_inches="tight", pad_inches=0, transparent=True)

    return cargo
