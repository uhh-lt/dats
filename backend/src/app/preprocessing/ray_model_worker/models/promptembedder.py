import logging

import numpy as np
import torch
from dto.promptembedder import (
    PromptEmbedderInput,
    PromptEmbedderOutput,
)
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from sentence_transformers import SentenceTransformer

cc = conf.promptembedder

DEFAULT_MODEL = cc.model
MAX_SEQ_LEN = cc.max_seq_length
BATCH_SIZE = cc.batch_size
DEVICE = cc.device

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("promptembedder"))
class PromptEmbedderModel:
    def __init__(self):
        logger.debug(f"Loading PromptEmbedder {DEFAULT_MODEL} ...")
        encoder = SentenceTransformer(DEFAULT_MODEL, trust_remote_code=True).to(DEVICE)
        encoder.max_seq_length = MAX_SEQ_LEN
        encoder.tokenizer.padding_side = "right"
        encoder.eval()
        self.encoder = encoder

    def add_eos(self, input_examples):
        return [
            input_example + self.encoder.tokenizer.eos_token
            for input_example in input_examples
        ]

    def embed(self, input: PromptEmbedderInput) -> PromptEmbedderOutput:
        with torch.no_grad():
            embeddings = self.encoder.encode(
                sentences=self.add_eos(input.data),
                prompt="Instruct: " + input.prompt + "\nQuery: ",
                batch_size=BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )

            assert isinstance(embeddings, np.ndarray), "Failed to encode texts"

            return PromptEmbedderOutput(embeddings=embeddings.tolist())
