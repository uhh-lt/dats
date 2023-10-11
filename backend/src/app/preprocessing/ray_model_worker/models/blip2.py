import logging

import torch
from config import build_ray_model_deployment_config, conf
from dto.blip2 import Blip2FilePathInput, Blip2Output
from PIL import Image
from ray import serve
from transformers import Blip2ForConditionalGeneration, Blip2Processor

cc = conf.blip2

DEVICE = cc.device
MODEL = cc.model
MAX_CAPTION_LENGTH = cc.image_captioning.max_caption_length
NUM_BEAMS = cc.image_captioning.num_beams


logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("blip2"))
class Blip2Model:
    def __init__(self):
        logger.debug(f"Loading Blip2Processor {MODEL} ...")
        image_processor: Blip2Processor = Blip2Processor.from_pretrained(MODEL)

        logger.debug(f"Loading Blip2ForConditionalGeneration {MODEL} ...")
        captioning_model: Blip2ForConditionalGeneration = (
            Blip2ForConditionalGeneration.from_pretrained(MODEL)
        )
        captioning_model.to(DEVICE)
        captioning_model.eval()

        self.feature_extractor = image_processor
        self.captioning_model = captioning_model

    def image_captioning(self, input: Blip2FilePathInput) -> Blip2Output:
        # load the image
        with Image.open(input.image_fp) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            pixel_values = self.feature_extractor(
                images=[img], return_tensors="pt"
            ).pixel_values.to(DEVICE)

        with torch.no_grad():
            output_ids = self.captioning_model.generate(
                pixel_values, max_length=MAX_CAPTION_LENGTH, num_beams=NUM_BEAMS
            )
            captions = self.feature_extractor.batch_decode(
                output_ids, skip_special_tokens=True
            )
            caption = str(captions[0]).strip()
        return Blip2Output(caption=caption)
