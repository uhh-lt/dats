from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.ray_repo import RayRepo

ray = RayRepo()


def run_spacy_pipeline(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    assert isinstance(pptd.metadata["language"], str), "Language is not a string"
    spacy_input: SpacyInput = SpacyInput(
        text=pptd.text,
        language=pptd.metadata["language"],
    )
    spacy_output: SpacyPipelineOutput = ray.spacy_pipline(spacy_input)
    pptd.spacy_pipeline_output = spacy_output

    return cargo
