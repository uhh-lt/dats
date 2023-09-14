from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from app.preprocessing.ray_model_service import RayModelService


rms = RayModelService()


def run_spacy_pipeline(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    spacy_input: SpacyInput = SpacyInput(
        text=pptd.text,
        language=pptd.metadata["language"],
    )
    spacy_output: SpacyPipelineOutput = rms.spacy_pipline(spacy_input)
    pptd.spacy_pipeline_output = spacy_output

    return cargo
