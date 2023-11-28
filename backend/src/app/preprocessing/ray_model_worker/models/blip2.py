import logging

import torch
from dto.blip2 import Blip2FilePathInput, Blip2Output
from PIL import Image
from ray import serve
from transformers import Blip2ForConditionalGeneration, Blip2Processor

from config import build_ray_model_deployment_config, conf

cc = conf.blip2

DEVICE = cc.device
MODEL = cc.model
MAX_CAPTION_LENGTH = cc.image_captioning.max_caption_length
NUM_BEAMS = cc.image_captioning.num_beams
PRECISION_BIT = cc.precision_bit

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("blip2"))
class Blip2Model:
    def __init__(self):
        logger.debug(f"Loading Blip2Processor {MODEL} ...")
        image_processor: Blip2Processor = Blip2Processor.from_pretrained(MODEL)

        device_map = {"": 0}
        load_in_8bit = False
        if PRECISION_BIT == 32:
            data_type = torch.float32
            if DEVICE == "cpu":
                device_map = {"": "cpu"}
        elif DEVICE == "cuda" and PRECISION_BIT == 16:
            data_type = torch.float16
        elif DEVICE == "cuda" and PRECISION_BIT == 8:
            data_type = torch.bfloat16
            load_in_8bit = True
        else:
            msg = f"Cannot run {MODEL} in {PRECISION_BIT}-bit on CPU"
            logger.error(msg)
            raise RuntimeError(msg)

        logger.debug(
            f"Loading Blip2ForConditionalGeneration {MODEL} with {PRECISION_BIT} precision ..."
        )

        captioning_model: Blip2ForConditionalGeneration = (
            Blip2ForConditionalGeneration.from_pretrained(
                MODEL,
                load_in_8bit=load_in_8bit,
                device_map=device_map,
                torch_dtype=data_type,
            )
        )
        captioning_model.eval()
        self.data_type = data_type
        self.feature_extractor = image_processor
        self.captioning_model = captioning_model

    def image_captioning(self, input: Blip2FilePathInput) -> Blip2Output:
        # load the image
        with Image.open(input.image_fp) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            pixel_values = self.feature_extractor(
                images=[img], return_tensors="pt"
            ).pixel_values.to(DEVICE, dtype=self.data_type)

        with torch.no_grad():
            output_ids = self.captioning_model.generate(
                pixel_values, max_length=MAX_CAPTION_LENGTH, num_beams=NUM_BEAMS
            )
            captions = self.feature_extractor.batch_decode(
                output_ids, skip_special_tokens=True
            )
            caption = str(captions[0]).strip()
        return Blip2Output(caption=caption)
