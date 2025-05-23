from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc
from loguru import logger

POSSIBLE_METADATA = [
    "language",
    "transcription_keywords",
]


def create_ppad_from_video(cargo: PipelineCargo) -> PipelineCargo:
    ppvd: PreProVideoDoc = cargo.data["ppvd"]

    # here we just send the video file to the audio pipeline
    # because ffmpeg in the audio pipeline will extract the audio stream automatically
    ppad = PreProAudioDoc(
        filename=ppvd.audio_filepath.name,
        filepath=ppvd.audio_filepath,
        project_id=ppvd.project_id,
        mime_type="audio/mpeg",
        word_level_transcriptions=ppvd.word_level_transcriptions,
    )
    for metadata_key in POSSIBLE_METADATA:
        if metadata_key in ppvd.metadata:
            logger.info(f"Passing {metadata_key} from video metadata to audio metadata")
            ppad.metadata[metadata_key] = ppvd.metadata[metadata_key]

    cargo.data["ppad"] = ppad
    return cargo
