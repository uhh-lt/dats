import ffmpeg
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc


def create_ffmpeg_probe_video_metadata(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]
    ffmpeg_probe = ffmpeg.probe(ppvd.filepath)

    for k, v in ffmpeg_probe["format"].items():
        ppvd.metadata[k] = v

    vidx = 0 if ffmpeg_probe["streams"][0]["codec_type"] == "video" else 1
    for md in ["width", "height", "display_aspect_ratio"]:
        if md in ffmpeg_probe["streams"][vidx]:
            ppvd.metadata[md] = ffmpeg_probe["streams"][vidx][md]

    return cargo
