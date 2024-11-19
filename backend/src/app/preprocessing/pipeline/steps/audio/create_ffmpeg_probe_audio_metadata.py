import ffmpeg

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo

EXPECTED_METADATA = [
    "url",
    "word_level_transcriptions",
    "duration",
    "format_name",
    "format_long_name",
    "size",
    "bit_rate",
    "tags",
]


def create_ffmpeg_probe_audio_metadata(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    for metadata_key in EXPECTED_METADATA:
        if metadata_key not in ppad.metadata:
            ffmpeg_probe = ffmpeg.probe(ppad.filepath)

            for k, v in ffmpeg_probe["format"].items():
                ppad.metadata[k] = v
            return cargo
    return cargo
