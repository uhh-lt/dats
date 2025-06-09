import logging

import numpy as np
import torch
from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from sentence_transformers import SentenceTransformer
from utils import base64_to_image

cc = conf.clip

TEXT_DEVICE = cc.text_encoder.device
IMAGE_DEVICE = cc.image_encoder.device
TEXT_MODEL = cc.text_encoder.model
IMAGE_MODEL = cc.image_encoder.model
TEXT_BATCH_SIZE = cc.text_encoder.batch_size
IMAGE_BATCH_SIZE = cc.image_encoder.batch_size

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("clip"))
class ClipModel:
    def __init__(self):
        logger.debug(f"Loading ClipModel {TEXT_MODEL} for text ...")
        text_encoder = SentenceTransformer(TEXT_MODEL).to(TEXT_DEVICE)
        text_encoder.eval()
        self.text_encoder = text_encoder

        logger.debug(f"Loading ClipModel {IMAGE_MODEL} for image ...")
        image_encoder = SentenceTransformer(IMAGE_MODEL).to(IMAGE_DEVICE)
        image_encoder.eval()
        self.image_encoder = image_encoder

    def text_embedding(self, input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        with torch.no_grad():
            encoded_text = self.text_encoder.encode(
                sentences=input.text,
                batch_size=TEXT_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                device=TEXT_DEVICE,
                convert_to_numpy=True,
            )
            assert isinstance(encoded_text, np.ndarray), "Failed to encode texts"

            return ClipEmbeddingOutput(embeddings=encoded_text.tolist())

    def image_embedding(self, input: ClipImageEmbeddingInput) -> ClipEmbeddingOutput:
        images = [base64_to_image(b64) for b64 in input.base64_images]

        with torch.no_grad():
            encoded_images = self.image_encoder.encode(
                sentences=images,  # type: ignore
                batch_size=IMAGE_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                device=IMAGE_DEVICE,
                convert_to_numpy=True,
            )
            assert isinstance(encoded_images, np.ndarray), "Failed to encode images"

            # close the images
            for img in images:
                img.close()
            return ClipEmbeddingOutput(embeddings=encoded_images.tolist())
