from collections import Counter
from pathlib import Path
from typing import TypedDict

import numpy as np
import torch
from datasets import Dataset
from loguru import logger
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from setfit import SetFitModel, Trainer, TrainingArguments, sample_dataset

from common.doc_type import DocType
from config import conf
from repos.filesystem_repo import FilesystemRepo


class EmbeddingModelConfig(TypedDict):
    model_name: str
    batch_size: int
    max_seq_length: int


class PromptEmbedderInput(BaseModel):
    project_id: int = Field(description="Project ID")
    model_name: str = Field(
        description="Model Name. If 'default', uses default model, otherwise a model is trained or loaded."
    )
    prompt: str = Field(description="Prompt for the model")
    modality: DocType = Field(description="Modality of the input data")
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
    This service handles the embedding of data using a specified model and prompt.
    It can use a default pre-trained model or train/load a custom model based on the provided input.

    Note: This service must be run by a GPU worker!
    """

    def __init__(self, device: str):
        self.device = device

        self.model_conf: dict[DocType, EmbeddingModelConfig] = {
            DocType.text: EmbeddingModelConfig(
                model_name=conf.promptembedder.text.model,
                batch_size=conf.promptembedder.text.batch_size,
                max_seq_length=conf.promptembedder.text.max_seq_length,
            ),
            DocType.image: EmbeddingModelConfig(
                model_name=conf.promptembedder.image.model,
                batch_size=conf.promptembedder.image.batch_size,
                max_seq_length=conf.promptembedder.image.max_seq_length,
            ),
        }

    def __prepare_image_input(self, prompt: str, inputs: list[str]) -> list:
        data = []
        for i in inputs:
            if Path(i).is_file():
                # a) Input is an image file path
                if Path(i).exists():
                    data.append(dict(image=str(i), prompt=prompt))
                else:
                    raise ValueError(f"Image file {i} does not exist.")
            else:
                # b) Input is a text
                data.append(dict(text=i, prompt=prompt))

        return data

    def __prepare_text_input(self, prompt: str, inputs: list[str]) -> list:
        def _remove_linebreaks(text: str) -> str:
            return " ".join(text.splitlines()).strip()

        return [
            f"Instruct: {prompt.strip()}\nQuery: {_remove_linebreaks(text)}"
            for text in inputs
        ]

    def _prepare_input(self, modality: DocType, prompt: str, inputs: list[str]) -> list:
        if modality == DocType.image:
            return self.__prepare_image_input(prompt, inputs)
        else:
            return self.__prepare_text_input(prompt, inputs)

    def embed(self, input: PromptEmbedderInput) -> PromptEmbedderOutput:
        # validate input: either all values of data and train_docs are str or all are Path
        if input.modality == DocType.audio or input.modality == DocType.video:
            raise ValueError(f"Modality {input.modality} is not supported.")

        # Load (or train) model
        if input.model_name == "default":
            default_model = self.model_conf[input.modality]["model_name"]
            logger.info(f"Loading default model {default_model} ...")
            encoder = SentenceTransformer(
                default_model, trust_remote_code=True, device="cpu"
            )
        else:
            # Skip fine-tuning for image models
            if input.modality == DocType.image:
                raise ValueError(
                    "Custom models are not supported for image embeddings."
                )

            model_dir = FilesystemRepo().get_model_dir(
                proj_id=input.project_id,
                model_name=input.model_name,
                model_prefix=f"prompt_embedder_{input.modality}_",
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
                    model_prefix=f"prompt_embedder_chkpt_{input.modality}_",
                )
                encoder = self._finetune(
                    model_dir=model_dir,
                    checkpoint_dir=checkpoint_dir,
                    instruction=input.prompt,
                    train_docs=input.train_docs,
                    train_labels=input.train_labels,
                    modality=input.modality,
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
        encoder.max_seq_length = self.model_conf[input.modality]["max_seq_length"]
        encoder = encoder.half().to(self.device)
        encoder = encoder.eval()

        # Prepare input data
        data = self._prepare_input(input.modality, input.prompt, input.data)

        # Embed data
        result = PromptEmbedderOutput(embeddings=[])
        with torch.no_grad():
            embeddings = encoder.encode(
                data,
                batch_size=self.model_conf[input.modality]["batch_size"],
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
        modality: DocType,
    ) -> SentenceTransformer:
        if not len(train_docs) == len(train_labels):
            raise ValueError("Training documents and labels must have the same length.")

        # 1. Prepare training data
        label_names = list(set(train_labels))
        label2id = {label: i for i, label in enumerate(label_names)}
        labels = [label2id[label] for label in train_labels]
        train_data = self._prepare_input(modality, instruction, train_docs)
        train_ds = Dataset.from_dict(
            {
                "text": train_data,
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
            self.model_conf[modality]["model_name"],
            device=self.device,
            trust_remote_code=True,
        )
        assert model.model_body is not None, "Model body is None"
        model.model_body.max_seq_length = self.model_conf[modality]["max_seq_length"]

        # 3. Init training
        args = TrainingArguments(
            batch_size=self.model_conf[modality]["batch_size"],
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
