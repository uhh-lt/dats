from core.user.user_crud import SYSTEM_USER_ID
from loguru import logger
from preprocessing.pipeline.model.image.autobbox import AutoBBox
from preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from ray_model_worker.dto.detr import DETRImageInput
from repos.ray_repo import RayRepo
from util.image_utils import image_to_base64, load_image

ray = RayRepo()


def run_object_detection(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    input = DETRImageInput(
        base64_image=image_to_base64(load_image(ppid.filepath)),
    )
    result = ray.detr_object_detection(input)
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
