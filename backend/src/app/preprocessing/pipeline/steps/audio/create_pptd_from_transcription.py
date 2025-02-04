from pathlib import Path

from loguru import logger

from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def create_pptd_from_transcription(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]
    ppad.metadata["transcription"] = " ".join(
        [a.text for a in ppad.word_level_transcriptions]
    )
    logger.info(f"1234 {ppad.metadata['transcription']}")
    pptd = PreProTextDoc(
        filepath=Path("/this/is/a/fake_path.txt"),
        filename="fake_path.txt",
        project_id=ppad.project_id,
        text=ppad.metadata["transcription"],
        html=f"<html><body><p>{ppad.metadata['transcription']}</p></body></html>",
        metadata={"language": "en"},
        mime_type="text/plain",
    )

    if "transcription_keywords" in ppad.metadata:
        logger.info("Pass keywords from ppad to pptd")
        pptd.metadata["keywords"] = ppad.metadata["transcription_keywords"]

    cargo.data["pptd"] = pptd
    return cargo
