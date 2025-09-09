from collections import Counter
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset
from loguru import logger
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from setfit import SetFitModel, Trainer, TrainingArguments, sample_dataset

from config import conf
from repos.filesystem_repo import FilesystemRepo

DEFAULT_MODEL = conf.promptembedder.model
MAX_SEQ_LEN = conf.promptembedder.max_seq_length
BATCH_SIZE = conf.promptembedder.batch_size


class PromptEmbedderInput(BaseModel):
    project_id: int = Field(description="Project ID")
    model_name: str = Field(
        description="Model Name. If 'default', uses default model, otherwise a model is trained or loaded."
    )
    prompt: str = Field(description="Prompt for the model")
    data: list[str] = Field(description="Text Data to embed")
    train_docs: list[str] | None = Field(
        default=None, description="Documents to train the model on"
    )
    train_labels: list[str] | None = Field(
        default=None, description="Labels for the documents"
    )


class PromptEmbedderOutput(BaseModel):
    embeddings: list[list[float]] = Field(description="Embeddings of the input data.")


class PromptEmbedder:
    """
    This service handles the embedding of text data using a specified model and prompt.
    It can use a default pre-trained model or train/load a custom model based on the provided input.

    Note: This service must be run by a GPU worker!
    """

    def __init__(self, device: str):
        self.device = device

    def embed(self, input: PromptEmbedderInput) -> PromptEmbedderOutput:
        # Load (or train) model
        if input.model_name == "default":
            # Use default model
            logger.info(f"Loading default model {DEFAULT_MODEL} ...")
            encoder = SentenceTransformer(
                DEFAULT_MODEL, trust_remote_code=True, device="cpu"
            )
        else:
            model_dir = FilesystemRepo().get_model_dir(
                proj_id=input.project_id,
                model_name=input.model_name,
                model_prefix="prompt_embedder_",
            )
            if not model_dir.exists():
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

                checkpoint_dir = FilesystemRepo().get_model_dir(
                    proj_id=input.project_id,
                    model_name=input.model_name,
                    model_prefix="prompt_embedder_chkpt_",
                )
                encoder = self._finetune(
                    model_dir=model_dir,
                    checkpoint_dir=checkpoint_dir,
                    instruction=input.prompt,
                    train_docs=input.train_docs,
                    train_labels=input.train_labels,
                )
            else:
                # Load custom model
                logger.info(f"Loading custom model from {model_dir} ...")
                setfit_model = SetFitModel.from_pretrained(
                    str(model_dir), trust_remote_code=True, device="cpu"
                )
                assert setfit_model.model_body is not None, "Model body is None"
                encoder = setfit_model.model_body

        # init model correctly for inference
        encoder.max_seq_length = MAX_SEQ_LEN
        encoder = encoder.half().to(self.device)
        encoder = encoder.eval()

        # Embed data
        result = PromptEmbedderOutput(embeddings=[])
        with torch.no_grad():
            embeddings = encoder.encode(
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
                f"Encoded {len(input.data)} documents with model {encoder._get_name()}!"
            )
            assert isinstance(embeddings, np.ndarray), "Failed to encode documents"
            result.embeddings = embeddings.tolist()

        # Free memory
        del encoder
        torch.cuda.empty_cache()

        return result

    def _finetune(
        self,
        checkpoint_dir: Path,
        model_dir: Path,
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
            device=self.device,
            trust_remote_code=True,
        )
        assert model.model_body is not None, "Model body is None"
        model.model_body.max_seq_length = MAX_SEQ_LEN

        # 3. Init training
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
        model.save_pretrained(model_dir)

        return model.model_body

    def _remove_linebreaks(self, text: str) -> str:
        return " ".join(text.splitlines()).strip()

    def _get_detailed_instruct(self, task_description: str, query: str) -> str:
        return f"Instruct: {task_description.strip()}\nQuery: {self._remove_linebreaks(query)}"
