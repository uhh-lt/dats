from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.blip2 import Blip2FilePathInput

# from app.preprocessing.ray_model_worker.dto.vit_gpt2 import ViTGPT2FilePathInput

rms = RayModelService()


def generate_image_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]
    # input = ViTGPT2FilePathInput(image_fp=str(ppid.filepath))
    input = Blip2FilePathInput(image_fp=str(ppid.filepath))
    # result = rms.vit_gpt2_image_captioning(input)
    result = rms.blip2_image_captioning(input)

    ppid.metadata["caption"] = result.caption

    return cargo
