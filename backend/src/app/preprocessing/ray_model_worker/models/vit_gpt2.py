import logging

import torch
from dto.vit_gpt2 import ViTGPT2FilePathInput, ViTGPT2Output
from PIL import Image
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from transformers import (
    GPT2TokenizerFast,
    VisionEncoderDecoderModel,
    ViTFeatureExtractor,
)

cc = conf.vit_gpt2

DEVICE = cc.device
MODEL = cc.model
MAX_CAPTION_LENGTH = cc.image_captioning.max_caption_length
NUM_BEAMS = cc.image_captioning.num_beams


logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("vit_gpt2"))
class ViTGPT2Model:
    def __init__(self):
        logger.debug(f"Loading ViTFeatureExtractor {MODEL} ...")
        image_processor: ViTFeatureExtractor = ViTFeatureExtractor.from_pretrained(
            MODEL
        )

        logger.debug(f"Loading VisionEncoderDecoderModel {MODEL} ...")
        captioning_model: VisionEncoderDecoderModel = (
            VisionEncoderDecoderModel.from_pretrained(MODEL)
        )
        captioning_model.to(DEVICE)
        captioning_model.eval()

        tokenizer: GPT2TokenizerFast = GPT2TokenizerFast.from_pretrained(MODEL)

        self.feature_extractor = image_processor
        self.captioning_model = captioning_model
        self.tokenizer = tokenizer

    def image_captioning(self, input: ViTGPT2FilePathInput) -> ViTGPT2Output:
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

            captions = self.tokenizer.batch_decode(output_ids, skip_special_tokens=True)
            caption = str(captions[0]).strip()

        return ViTGPT2Output(caption=caption)
