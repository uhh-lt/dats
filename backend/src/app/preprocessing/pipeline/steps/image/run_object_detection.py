from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.detr import DETRFilePathInput

rms = RayModelService()


def run_object_detection(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    input = DETRFilePathInput(image_fp=str(ppid.filepath))
    result = rms.detr_object_detection(input)

    for box in result.bboxes:
        bbox = AutoBBox(
            code=box.label,
            x_min=box.x_min,
            y_min=box.y_min,
            x_max=box.x_max,
            y_max=box.y_max,
        )
        ppid.bboxes.append(bbox)

    return cargo
