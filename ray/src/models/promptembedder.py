import logging
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset
from ray import serve
from sentence_transformers import SentenceTransformer
from setfit import SetFitModel, Trainer, TrainingArguments, sample_dataset

from config import build_ray_model_deployment_config, conf
from dto.promptembedder import (
    PromptEmbedderInput,
    PromptEmbedderOutput,
)

cc = conf.promptembedder

DEFAULT_MODEL = cc.model
MAX_SEQ_LEN = cc.max_seq_length
BATCH_SIZE = cc.batch_size
DEVICE = cc.device
ROOT_DIR: Path = Path(cc.root_dir)

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("promptembedder"))
class PromptEmbedderModel:
    def __init__(self):
        logger.debug(f"Loading PromptEmbedder {DEFAULT_MODEL} ...")
        self.encoder = SentenceTransformer(
            DEFAULT_MODEL, trust_remote_code=True, device="cpu"
        )
        self.encoder_name = "default"
        self._init_encoder_for_inference()

    def _init_encoder_for_inference(self):
        self.encoder.max_seq_length = MAX_SEQ_LEN
        self.encoder = self.encoder.half().to(DEVICE)
        self.encoder = self.encoder.eval()

    def __get_checkpoints_dir(
        self,
        model_name: str,
    ) -> Path:
        return ROOT_DIR / "emb_checkpoints" / f"{model_name}"

    def __get_model_path(
        self,
        model_name: str,
    ) -> Path:
        return ROOT_DIR / "emb_models" / f"{model_name}"

    def _remove_linebreaks(self, text: str) -> str:
        return " ".join(text.splitlines()).strip()

    def _get_detailed_instruct(self, task_description: str, query: str) -> str:
        return f"Instruct: {task_description.strip()}\nQuery: {self._remove_linebreaks(query)}"

    def _finetune(
        self,
        model_name: str,
        instruction: str,
        train_docs: list[str],
        train_labels: list[str],
    ) -> SentenceTransformer:
        if not len(train_docs) == len(train_labels):
            raise ValueError("Training documents and labels must have the same length.")

        # 1. Prepare training data
        label_names = list(set(train_labels))
        label2id = {label: i for i, label in enumerate(label_names)}
        labels = [label2id[label] for label in train_labels]
        train_ds = Dataset.from_dict(
            {
                "text": [
                    self._get_detailed_instruct(task_description=instruction, query=doc)
                    for doc in train_docs
                ],
                "label": labels,
            }
        )
        class_counts = Counter(train_ds["label"])
        num_samples = min(class_counts.values())  # minimum number of samples per class
        train_n_shot = sample_dataset(
            train_ds, label_column="label", num_samples=num_samples, seed=42
        )
        logger.info(
            f"Training with {len(train_n_shot)} examples, "
            f"{len(label_names)} classes, "
            f"examples per class: {num_samples}"
        )

        # 2. Initialize model
        model = SetFitModel.from_pretrained(
            DEFAULT_MODEL,
            device=DEVICE,
            trust_remote_code=True,
        )
        assert model.model_body is not None, "Model body is None"
        model.model_body.max_seq_length = MAX_SEQ_LEN

        # 3. Init training
        checkpoint_dir = self.__get_checkpoints_dir(model_name=model_name)
        args = TrainingArguments(
            batch_size=BATCH_SIZE,
            num_epochs=1,
            output_dir=str(checkpoint_dir),
            use_amp=True,
            report_to="none",
        )
        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=train_n_shot,
        )

        # 4. Train model
        logger.info("Starting training...")
        trainer.train()
        logger.info("Training completed.")

        # 5. Save model
        model_path = self.__get_model_path(model_name=model_name)
        model.save_pretrained(model_path)

        return model.model_body

    def embed(self, input: PromptEmbedderInput) -> PromptEmbedderOutput:
        # Check if correct model is not loaded
        if self.encoder_name != input.model_name:
            # Load (or train) model
            if input.model_name == "default":
                # Use default model
                logger.info(f"Loading default model {DEFAULT_MODEL} ...")
                self.encoder = SentenceTransformer(
                    DEFAULT_MODEL, trust_remote_code=True, device="cpu"
                )
            else:
                model_path = self.__get_model_path(model_name=input.model_name)
                if not model_path.exists():
                    # Train custom model
                    logger.info(f"Training custom model {input.model_name}...")

                    if not input.train_docs:
                        raise ValueError(
                            "Training documents are required for custom model training."
                        )
                    if not input.train_labels:
                        raise ValueError(
                            "Training labels are required for custom model training."
                        )
                    self.encoder = self._finetune(
                        model_name=input.model_name,
                        instruction=input.prompt,
                        train_docs=input.train_docs,
                        train_labels=input.train_labels,
                    )
                else:
                    # Load custom model
                    logger.info(f"Loading custom model from {model_path} ...")
                    setfit_model = SetFitModel.from_pretrained(
                        str(model_path), trust_remote_code=True, device="cpu"
                    )
                    assert setfit_model.model_body is not None, "Model body is None"
                    self.encoder = setfit_model.model_body

            # init model correctly for inference
            self.encoder_name = input.model_name
            self._init_encoder_for_inference()
        else:
            logger.info(
                f"Using already loaded model {self.encoder_name} for embedding."
            )

        # Embed data
        with torch.no_grad():
            embeddings = self.encoder.encode(
                sentences=[
                    self._get_detailed_instruct(
                        task_description=input.prompt, query=text
                    )
                    for text in input.data
                ],
                batch_size=BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )
            logger.info(
                f"Encoded {len(input.data)} documents with model {self.encoder._get_name()}!"
            )
            assert isinstance(embeddings, np.ndarray), "Failed to encode documents"
            return PromptEmbedderOutput(embeddings=embeddings.tolist())
