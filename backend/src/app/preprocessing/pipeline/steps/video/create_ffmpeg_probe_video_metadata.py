import ffmpeg

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc


def create_ffmpeg_probe_video_metadata(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]
    ffmpeg_probe = ffmpeg.probe(ppvd.filepath)

    for k, v in ffmpeg_probe["format"].items():
        ppvd.metadata[k] = v

    vi = 0 if ffmpeg_probe["streams"][0]["codec_type"] == "video" else 1
    ppvd.metadata["frame_width"] = ffmpeg_probe["streams"][vi]["width"]
    ppvd.metadata["frame_height"] = ffmpeg_probe["streams"][vi]["height"]
    ppvd.metadata["aspect_ratio"] = ffmpeg_probe["streams"][vi]["display_aspect_ratio"]

    return cargo
