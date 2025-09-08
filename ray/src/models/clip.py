import logging

import numpy as np
import torch
from ray import serve
from sentence_transformers import SentenceTransformer

from config import build_ray_model_deployment_config, conf
from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from utils import base64_to_image

cc = conf.clip

TEXT_DEVICE = cc.text_encoder.device
IMAGE_DEVICE = cc.image_encoder.device
TEXT_MODEL = cc.text_encoder.model
IMAGE_MODEL = cc.image_encoder.model
TEXT_BATCH_SIZE = cc.text_encoder.batch_size
IMAGE_BATCH_SIZE = cc.image_encoder.batch_size

logger = logging.getLogger("ray.serve")


@serve.deployment(max_ongoing_requests=64, **build_ray_model_deployment_config("clip"))
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

    @serve.batch(max_batch_size=32, batch_wait_timeout_s=0.2)
    async def text_embedding(
        self, inputs: list[ClipTextEmbeddingInput]
    ) -> list[ClipEmbeddingOutput]:
        doc_sentences = [doc.text for doc in inputs]
        sentences = [s for sents in doc_sentences for s in sents]
        logger.info("CLIP num docs %d, total sentences %d", len(inputs), len(sentences))

        with torch.no_grad():
            encoded_text = self.text_encoder.encode(
                sentences=sentences,
                batch_size=TEXT_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                device=TEXT_DEVICE,
                convert_to_numpy=True,
            )
            assert isinstance(encoded_text, np.ndarray), "Failed to encode texts"
        offset = 0
        results = []
        for doc in doc_sentences:
            emb = encoded_text[offset : offset + len(doc)]
            offset += len(doc)
            results.append(ClipEmbeddingOutput(embeddings=emb.tolist()))
        return results

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
