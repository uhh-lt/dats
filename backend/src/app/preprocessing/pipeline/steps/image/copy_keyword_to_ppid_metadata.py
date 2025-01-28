from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def copy_keyword_to_ppid_metadata(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    ppid: PreProImageDoc = cargo.data["ppid"]
    ppid.metadata["keywords"] = pptd.metadata["keywords"]
    return cargo
