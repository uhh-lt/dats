from pathlib import Path

from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def create_pptd_from_description(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    description = ppid.metadata["caption"]
    if isinstance(description, list):
        description = " ".join(description)
    assert isinstance(description, str), (
        f"The image caption has to be string, but was {type(description)} instead"
    )
    # we don't need to set the filepath and filename as they are not used for the text
    # tasks  we apply on the image description.
    pptd = PreProTextDoc(
        filepath=Path("/this/is/a/fake_path.txt"),
        filename="fake_path.txt",
        project_id=ppid.project_id,
        text=description,
        html=f"<html><body><p>{description}</p></body></html>",
        metadata={"language": "en"},
        mime_type="text/plain",
    )

    cargo.data["pptd"] = pptd

    return cargo
