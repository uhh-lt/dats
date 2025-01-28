from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.pipeline.model.video.preprovideodoc import PreProVideoDoc


def copy_pptd_to_ppvd_metadata(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    ppvd: PreProVideoDoc = cargo.data["ppad"]
    ppvd.metadata["language"] = pptd.metadata["language"]
    ppvd.metadata["keywords"] = pptd.metadata["keywords"]
    ppvd.metadata["transcription_keywords"] = pptd.metadata["keywords"]
    return cargo
