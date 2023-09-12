from functools import lru_cache
from typing import Tuple

import torch
from app.preprocessing.pipeline.model.image.preproimagedoc import PreProImageDoc
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from config import conf
from loguru import logger
from PIL import Image
from transformers import AutoTokenizer, VisionEncoderDecoderModel, ViTImageProcessor

DEVICE = conf.preprocessing.image.image_captioning.device
MODEL = conf.preprocessing.image.image_captioning.model
MAX_CAPTION_LENGTH = conf.preprocessing.image.image_captioning.max_caption_length
NUM_BEAMS = conf.preprocessing.image.image_captioning.num_beams

# Flo: This is important! Otherwise, it will not work with celery thread management and just hang!!!
torch.set_num_threads(1)


@lru_cache(maxsize=1)
def load_image_captioning_models(
    foo: str = "bar",
) -> Tuple[ViTImageProcessor, VisionEncoderDecoderModel, AutoTokenizer]:
    logger.debug(f"Loading ViTFeatureExtractor {MODEL} ...")
    image_processor = ViTImageProcessor.from_pretrained(MODEL)

    logger.debug(f"Loading VisionEncoderDecoderModel {MODEL} ...")
    captioning_model = VisionEncoderDecoderModel.from_pretrained(MODEL)
    captioning_model.to(DEVICE)
    captioning_model.eval()

    tokenizer = AutoTokenizer.from_pretrained(MODEL)

    return image_processor, captioning_model, tokenizer


def generate_image_caption(cargo: PipelineCargo) -> PipelineCargo:
    ppid: PreProImageDoc = cargo.data["ppid"]

    (
        image_processor,
        caption_generation_model,
        tokenizer,
    ) = load_image_captioning_models()

    # load the image
    with Image.open(ppid.filepath) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        pixel_values = image_processor(
            images=[img], return_tensors="pt"
        ).pixel_values.to(DEVICE)

    with torch.no_grad():
        output_ids = caption_generation_model.generate(
            pixel_values, max_length=MAX_CAPTION_LENGTH, num_beams=NUM_BEAMS
        )

        captions = tokenizer.batch_decode(output_ids, skip_special_tokens=True)
        caption = str(captions[0]).strip()

        ppid.metadata["caption"] = caption

    return cargo
