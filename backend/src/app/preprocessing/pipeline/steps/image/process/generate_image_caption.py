from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.blip2 import Blip2FilePathInput

rms = RayModelService()


def generate_image_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    if "caption" not in ppid.metadata:
        input = Blip2FilePathInput(
            image_fp=str(ppid.filename), project_id=ppid.project_id
        )
        result = rms.blip2_image_captioning(input)

        ppid.metadata["caption"] = result.caption

    return cargo
