import ffmpeg
from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def create_ffmpeg_probe_audio_metadata(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    ffmpeg_probe = ffmpeg.probe(ppad.filepath)

    for k, v in ffmpeg_probe["format"].items():
        ppad.metadata[k] = v
    return cargo
