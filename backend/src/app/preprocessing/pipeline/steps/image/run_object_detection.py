from loguru import logger

from app.core.data.crud.user import SYSTEM_USER_ID
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
    logger.info(f"Bounding boxes already found are: {ppid.bboxes}")
    for box in result.bboxes:
        code_name = box.label
        bbox = AutoBBox(
            code=code_name,
            x_min=box.x_min,
            y_min=box.y_min,
            x_max=box.x_max,
            y_max=box.y_max,
            user_id=SYSTEM_USER_ID,
        )
        logger.info(f" Found bbox by detr with {bbox.model_dump_json(indent=4)}")
        if code_name not in ppid.bboxes:
            ppid.bboxes[code_name] = set()
        ppid.bboxes[code_name].add(bbox)
    logger.info(f"Resulted in {ppid.bboxes}")

    return cargo
