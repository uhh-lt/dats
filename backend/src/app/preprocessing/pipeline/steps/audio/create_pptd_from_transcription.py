from app.preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def create_pptd_from_transcription(cargo: PipelineCargo) -> PipelineCargo:
    ppad: PreProAudioDoc = cargo.data["ppad"]

    if not ppad.transcript_filepath.exists():
        raise FileNotFoundError(
            f"The transcription file {ppad.transcript_filepath} "
            f"for {cargo.ppj_payload.filename} does not exist!"
        )

    pptd = PreProTextDoc(
        filename=ppad.transcript_filepath.name,
        filepath=ppad.transcript_filepath,
        project_id=cargo.ppj_payload.project_id,
        mime_type="text/plain",
    )

    cargo.data["pptd"] = pptd
    return cargo
