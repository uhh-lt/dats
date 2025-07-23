from preprocessing.pipeline.model.audio.preproaudiodoc import PreProAudioDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def copy_pptd_to_ppad_metadata(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    ppad: PreProAudioDoc = cargo.data["ppad"]
    ppad.metadata["language"] = pptd.metadata["language"]
    ppad.metadata["keywords"] = pptd.metadata["keywords"]
    ppad.metadata["transcription_keywords"] = pptd.metadata["keywords"]
    return cargo
