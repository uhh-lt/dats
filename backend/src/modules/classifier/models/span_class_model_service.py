from collections import defaultdict
from pathlib import Path
from typing import Any, Literal, TypedDict, cast
from uuid import uuid4

import numpy as np
import pandas as pd
import pytorch_lightning as pl
import torch
import torch.nn as nn
from datasets import Dataset
from loguru import logger
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint
from pytorch_lightning.loggers import CSVLogger
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sqlalchemy import select
from sqlalchemy.orm import Session
from torch.utils.data import DataLoader
from transformers.data.data_collator import DataCollatorForTokenClassification
from transformers.models.auto.configuration_auto import AutoConfig
from transformers.models.auto.modeling_auto import AutoModelForTokenClassification
from transformers.models.auto.tokenization_auto import AutoTokenizer

from config import conf
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.user.user_crud import ASSISTANT_TRAINED_ID
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierAveraging,
    ClassifierClassMetrics,
    ClassifierClassStatistics,
    ClassifierCreate,
    ClassifierData,
    ClassifierDatasetStatistics,
    ClassifierEvaluationCreate,
    ClassifierEvaluationOutput,
    ClassifierEvaluationParams,
    ClassifierEvaluationRead,
    ClassifierInferenceOutput,
    ClassifierInferenceParams,
    ClassifierJobInput,
    ClassifierJobOutput,
    ClassifierLoss,
    ClassifierModel,
    ClassifierRead,
    ClassifierSignalStrength,
    ClassifierTask,
    ClassifierTrainingOutput,
    ClassifierTrainingParams,
    ProblematicSdoc,
)
from modules.classifier.classifier_exceptions import (
    BaseModelDoesNotExistError,
    EmptyDatasetError,
)
from modules.classifier.models.job_progress_callback import JobProgressCallback
from modules.classifier.models.model_utils import (
    IGNORE_LABEL_ID,
    O_LABEL_ID,
    O_LABEL_NAME,
    check_hf_model_exists,
)
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job

SQL_BATCH_SIZE = conf.postgres.batch_size


class InferenceDatasetRow(TypedDict):
    sdoc_id: int
    words: list[str]


class DatasetRow(InferenceDatasetRow):
    user_id: int
    labels: list[int]


class AnnotationResult(TypedDict):
    begin_token: int
    end_token: int
    class_id: int
    sdoc_id: int


class SpanClassificationLightningModel(pl.LightningModule):
    def __init__(
        self,
        base_name: str,
        num_labels: int,
        dropout: float,
        learning_rate: float,
        weight_decay: float,
        class_weights: list[float],
        id2label: dict[int, str] | None = None,
        label2id: dict[str, int] | None = None,
        averaging: Literal["micro", "macro"] = ClassifierAveraging.MICRO.value,
    ):
        super().__init__()
        # Saves hyperparameters to the checkpoint
        self.save_hyperparameters()

        # Load the pre-trained model
        self.config = AutoConfig.from_pretrained(base_name)
        self.config.attention_dropout = dropout
        self.config.classifier_dropout = dropout
        self.config.embedding_dropout = dropout
        self.config.mlp_dropout = dropout
        self.config.num_labels = num_labels
        self.config.id2label = id2label
        self.config.label2id = label2id
        self.model = AutoModelForTokenClassification.from_pretrained(
            base_name,
            config=self.config,
        )

        # Add adapter
        # lora_config = LoraConfig(
        #     r=16,
        #     lora_alpha=32,
        #     lora_dropout=0.05,
        #     bias="none",
        #     task_type=TaskType.TOKEN_CLS,
        #     target_modules=[
        #         "query",
        #         "value",
        #     ],  # this is model specific, we need to test every single model :/
        # )
        # self.model = get_peft_model(model, lora_config)

        # Store params
        self.num_labels = num_labels
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.averaging: Literal["micro", "macro"] = averaging

        # Buffers to accumulate token-level predictions/labels across batches
        # so that evaluation metrics are computed over the whole epoch instead
        # of being averaged from per-batch scores.
        self._val_preds: list[int] = []
        self._val_labels: list[int] = []
        self._test_preds: list[int] = []
        self._test_labels: list[int] = []
        # Per-class metrics of the most recent test epoch (label id -> metrics).
        self._last_class_metrics: list[dict] = []

        # Define custom loss function. ignore_index=IGNORE_LABEL_ID makes the
        # padding / special-token / subword labels (which are set to
        # IGNORE_LABEL_ID) not contribute to the loss. (This is the default,
        # but we set it explicitly.)
        self.loss_fn = nn.CrossEntropyLoss(
            weight=torch.tensor(class_weights), ignore_index=IGNORE_LABEL_ID
        )

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        labels: torch.Tensor | None = None,
        **kwargs,
    ) -> Any:
        return self.model(
            input_ids=input_ids, attention_mask=attention_mask, labels=labels
        )

    def training_step(self, batch: dict[str, Any], batch_idx: int) -> torch.Tensor:
        outputs = self(**batch)
        # the standard Cross Entropy Loss computed by HF model
        # hf_loss = outputs.loss

        # our weighted Cross Entropy Loss
        logits = outputs.logits
        labels = batch["labels"]
        loss = self.loss_fn(logits.view(-1, self.num_labels), labels.view(-1))

        self.log("train_loss", loss.detach(), on_step=False, on_epoch=True)
        return loss

    def _val_test_step(
        self, prefix: str, batch: dict[str, Any], batch_idx: int
    ) -> torch.Tensor:
        # Predict
        outputs = self(**batch)
        predictions = torch.argmax(outputs.logits, dim=2).tolist()

        # Accumulate token-level predictions/labels (ignoring IGNORE_LABEL_ID
        # padding) so that metrics can be computed once over the whole epoch.
        labels = batch["labels"].tolist()
        flat_preds = [
            pred_tok
            for prediction, label in zip(predictions, labels)
            for (pred_tok, gold_tok) in zip(prediction, label)
            if gold_tok != IGNORE_LABEL_ID
        ]
        flat_labels = [
            gold_tok
            for label in labels
            for gold_tok in label
            if gold_tok != IGNORE_LABEL_ID
        ]
        if prefix == "eval":
            self._val_preds.extend(flat_preds)
            self._val_labels.extend(flat_labels)
        else:
            self._test_preds.extend(flat_preds)
            self._test_labels.extend(flat_labels)

        # Log loss
        self.log(f"{prefix}_loss", outputs.loss.detach(), on_step=False, on_epoch=True)
        return outputs.loss.detach()

    def _compute_and_log_token_metrics(self, prefix: str) -> None:
        if prefix == "eval":
            preds, labels = self._val_preds, self._val_labels
        else:
            preds, labels = self._test_preds, self._test_labels

        if len(labels) == 0:
            return

        # Token-level metrics. A token counts as correct when its predicted
        # label matches the gold label. P/R/F1 use the configured averaging
        # strategy over the entity classes (label != O_LABEL_ID), excluding the
        # "O" class.
        entity_labels = [i for i in range(self.num_labels) if i != O_LABEL_ID]
        accuracy = float(accuracy_score(labels, preds))
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels,
            preds,
            labels=entity_labels,
            average=self.averaging,
            # sklearn's stub types zero_division as str only, but 0 is valid.
            zero_division=0,  # pyright: ignore[reportArgumentType]
        )

        self.log_dict(
            {
                f"{prefix}_precision": float(precision),
                f"{prefix}_recall": float(recall),
                f"{prefix}_f1": float(f1),
                f"{prefix}_accuracy": accuracy,
            },
            on_step=False,
            on_epoch=True,
            prog_bar=True,
        )

        # Per-class metrics over the entity classes (stored for both the
        # validation and test epochs so the post-training evaluation can persist
        # them).
        if prefix in ("eval", "test"):
            pc_precision, pc_recall, pc_f1, pc_support = cast(
                tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray],
                precision_recall_fscore_support(
                    labels,
                    preds,
                    labels=entity_labels,
                    average=None,
                    # sklearn's stub types zero_division as str only, but 0 is valid.
                    zero_division=0,  # pyright: ignore[reportArgumentType]
                ),
            )
            self._last_class_metrics = [
                {
                    "label_id": label_id,
                    "precision": float(pc_precision[i]),
                    "recall": float(pc_recall[i]),
                    "f1": float(pc_f1[i]),
                    "support": int(pc_support[i]),
                }
                for i, label_id in enumerate(entity_labels)
            ]

    def on_validation_epoch_end(self) -> None:
        self._compute_and_log_token_metrics("eval")
        self._val_preds.clear()
        self._val_labels.clear()

    def on_test_epoch_end(self) -> None:
        self._compute_and_log_token_metrics("test")
        self._test_preds.clear()
        self._test_labels.clear()

    @torch.no_grad()
    def validation_step(self, batch: dict[str, Any], batch_idx: int) -> torch.Tensor:
        return self._val_test_step(
            prefix="eval",
            batch=batch,
            batch_idx=batch_idx,
        )

    @torch.no_grad()
    def test_step(self, batch: dict[str, Any], batch_idx: int) -> torch.Tensor:
        return self._val_test_step(
            prefix="test",
            batch=batch,
            batch_idx=batch_idx,
        )

    @torch.no_grad()
    def predict_step(self, batch: dict[str, Any], batch_idx: int) -> Any:
        outputs = self.model(
            input_ids=batch["input_ids"],
            attention_mask=batch["attention_mask"],
        )
        predictions = torch.argmax(outputs.logits, dim=2).tolist()

        return {
            "chunk_idxs": batch["chunk_idx"],
            "predictions": predictions,
        }

    def configure_optimizers(self) -> torch.optim.Optimizer:
        optimizer = torch.optim.AdamW(
            self.parameters(),
            lr=self.learning_rate,
            weight_decay=self.weight_decay,
            fused=True,
        )
        return optimizer


class SpanClassificationModelService(TextClassificationModelService):
    def _build_label_mappings(
        self,
        db: Session,
        class_ids: list[int],
        merge_children_into_parent: bool,
    ) -> tuple[list[CodeORM], dict[int, int], dict[int, int], dict[int, str]]:
        """Builds the class/label mappings exactly as used for training.

        Returns (codes, classid2labelid, code2parent, id2label).
        """
        codes = crud_code.read_by_ids(db=db, ids=class_ids)

        if merge_children_into_parent:
            child_codes = [
                crud_code.read_with_children(db, code_id=id) for id in class_ids
            ]
            # All children of a parent share the parent's single label id, so
            # that the number of labels equals the number of parent classes.
            classid2labelid: dict[int, int] = {
                c.id: i + 1 for i, children in enumerate(child_codes) for c in children
            }
            code2parent = {
                code.id: parent
                for children, parent in zip(child_codes, class_ids)
                for code in children
            }
        else:
            classid2labelid = {code.id: i + 1 for i, code in enumerate(codes)}
            code2parent = {code: code for code in class_ids}

        classid2labelid[O_LABEL_ID] = O_LABEL_ID
        id2label = {i + 1: code.name for i, code in enumerate(codes)}
        id2label[O_LABEL_ID] = O_LABEL_NAME
        code2parent[O_LABEL_ID] = O_LABEL_ID

        return codes, classid2labelid, code2parent, id2label

    def compute_dataset_statistics(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        merge_children_into_parent: bool,
        base_model_name: str,
    ) -> ClassifierDatasetStatistics:
        # Build the label mappings exactly as in training
        codes, classid2labelid, code2parent, _ = self._build_label_mappings(
            db=db,
            class_ids=class_ids,
            merge_children_into_parent=merge_children_into_parent,
        )

        # Build the dataset exactly as in training
        tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        _, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=project_id,
            tag_ids=tag_ids,
            user_ids=user_ids,
            class_ids=list(classid2labelid.keys()),
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
            use_chunking=True,
        )

        # Compute statistics from the word-level labels (before splitting/chunking)
        labelid2classid = {v: k for k, v in classid2labelid.items()}
        class_units: dict[int, int] = {code.id: 0 for code in codes}
        class_examples: dict[int, int] = {code.id: 0 for code in codes}
        total_units = 0
        labeled_units = 0
        problematic_sdocs: list[ProblematicSdoc] = []

        for row in cast(list[DatasetRow], dataset):
            labels: list[int] = row["labels"]
            row_total = 0
            row_labeled = 0
            seen_classes: set[int] = set()
            for label in labels:
                if label == IGNORE_LABEL_ID:
                    continue
                row_total += 1
                if label != O_LABEL_ID:
                    row_labeled += 1
                    class_id = code2parent[labelid2classid[label]]
                    class_units[class_id] += 1
                    seen_classes.add(class_id)
            for class_id in seen_classes:
                class_examples[class_id] += 1

            total_units += row_total
            labeled_units += row_labeled
            if (
                row_total > 0
                and row_labeled / row_total < conf.classifier.weak_signal_threshold
            ):
                problematic_sdocs.append(
                    ProblematicSdoc(
                        sdoc_id=row["sdoc_id"],
                        total_units=row_total,
                        labeled_units=row_labeled,
                        labeled_percentage=row_labeled / row_total,
                    )
                )

        problematic_sdocs.sort(key=lambda p: p.labeled_percentage)

        signal_percentage = labeled_units / total_units if total_units > 0 else 0.0
        weak_threshold = conf.classifier.weak_signal_threshold
        strong_threshold = conf.classifier.strong_signal_threshold
        if signal_percentage < weak_threshold:
            signal_strength = ClassifierSignalStrength.WEAK
        elif signal_percentage <= strong_threshold:
            signal_strength = ClassifierSignalStrength.OK
        else:
            signal_strength = ClassifierSignalStrength.STRONG

        return ClassifierDatasetStatistics(
            total_units=total_units,
            labeled_units=labeled_units,
            signal_percentage=signal_percentage,
            signal_strength=signal_strength,
            weak_signal_threshold=weak_threshold,
            strong_signal_threshold=strong_threshold,
            classes=[
                ClassifierClassStatistics(
                    class_id=code.id,
                    num_examples=class_examples[code.id],
                    num_units=class_units[code.id],
                    unit_percentage=(
                        class_units[code.id] / total_units if total_units > 0 else 0.0
                    ),
                )
                for code in codes
            ],
            problematic_sdocs=problematic_sdocs,
        )

    def _retrieve_and_build_dataset(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        classid2labelid: dict[int, int],
        tokenizer,
        use_chunking: bool,
    ) -> tuple[dict[int, dict[int, list[SpanAnnotationORM]]], Dataset]:
        # Find documents
        sdoc_ids = [
            sdoc.id
            for sdoc in crud_sdoc.read_by_tags(
                db=db,
                project_id=project_id,
                tag_ids=tag_ids,
            )
        ]

        # Get annotations by user and source document
        # 1. construct result object, grouping annotations by user and source document
        user_id2sdoc_id2annotations: dict[int, dict[int, list[SpanAnnotationORM]]] = (
            defaultdict(lambda: defaultdict(list))
        )

        # 2. retrieve annotations from the database, in batches
        for i in range(0, len(sdoc_ids), SQL_BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + SQL_BATCH_SIZE]

            # 3. Build the SELECT statement
            stmt = (
                select(
                    SpanAnnotationORM,
                    AnnotationDocumentORM,
                )
                .join(SpanAnnotationORM.annotation_document)
                .where(
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    SpanAnnotationORM.code_id.in_(class_ids),
                )
            )

            # 4. Execute the statement and fetch the results
            batch_result = db.execute(stmt).all()
            for row in batch_result:
                annotation, adoc = row._tuple()
                user_id2sdoc_id2annotations[adoc.user_id][
                    adoc.source_document_id
                ].append(annotation)

        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)
        sdocid2data = {sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas}

        # Create a labeled dataset
        # Every annotated source document is part of the training data
        # If the same document was annotated by two different users it will be included twice
        dataset: list[DatasetRow] = []
        for user_id, sdoc_id2annotations in user_id2sdoc_id2annotations.items():
            sdoc_id2annotations = user_id2sdoc_id2annotations[user_id]
            for sdoc_id, annotations in sdoc_id2annotations.items():
                sdoc_data = sdocid2data[sdoc_id]
                words = sdoc_data.tokens
                labels = [O_LABEL_ID for word in words]
                for annotation in annotations:
                    labels[annotation.begin_token : annotation.end_token] = [
                        classid2labelid.get(annotation.code_id, O_LABEL_ID)
                    ] * (annotation.end_token - annotation.begin_token)
                dataset.append(
                    {
                        "sdoc_id": sdoc_data.id,
                        "user_id": user_id,
                        "words": words,
                        "labels": labels,
                    }
                )

        # Construct a tokenized huggingface dataset
        if len(dataset) == 0:
            logger.warning(
                "The span classification dataset is empty (no matching documents or annotations)."
            )
            empty_hf_dataset = Dataset.from_dict(
                {
                    "sdoc_id": [],
                    "user_id": [],
                    "words": [],
                    "labels": [],
                }
            )
            return user_id2sdoc_id2annotations, empty_hf_dataset

        def tokenize_and_align_labels(examples: dict):
            tokenized_inputs = tokenizer(
                examples["words"],
                truncation=not use_chunking,
                is_split_into_words=True,
                add_special_tokens=not use_chunking,
            )

            labels = []
            for i, label in enumerate(examples["labels"]):
                word_ids = tokenized_inputs.word_ids(
                    batch_index=i
                )  # Map tokens to their respective word.
                previous_word_idx = None
                label_ids = []
                for word_idx in word_ids:  # Set the special tokens to IGNORE_LABEL_ID.
                    if word_idx is None:
                        label_ids.append(IGNORE_LABEL_ID)
                    elif (
                        word_idx != previous_word_idx
                    ):  # Only label the first token of a given word.
                        label_ids.append(label[word_idx])
                    else:
                        label_ids.append(IGNORE_LABEL_ID)
                    previous_word_idx = word_idx
                labels.append(label_ids)

            tokenized_inputs["labels"] = labels
            return tokenized_inputs

        hf_dataset = Dataset.from_list(dataset)  # type: ignore
        tokenized_hf_dataset = hf_dataset.map(tokenize_and_align_labels, batched=True)
        tokenized_hf_dataset = tokenized_hf_dataset.remove_columns(["words"])

        return user_id2sdoc_id2annotations, tokenized_hf_dataset

    def train(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # 0. Check inputs
        # Does the provided model exist
        if not check_hf_model_exists(parameters.base_name):
            raise BaseModelDoesNotExistError(parameters.base_name)

        merge_children_into_parent = parameters.merge_children_into_parent

        tokenizer = AutoTokenizer.from_pretrained(parameters.base_name)
        if parameters.chunk_size:
            tokenizer.model_max_length = parameters.chunk_size
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        job.update(
            steps=[
                "Started classifier job",
                "Creating dataset",
                "Initializing PyTorch Lightning modules",
                "Training model",
                "Evaluating model",
                "Retrieving statistics",
                "Storing results",
            ]
        )

        # 1. Create dataset
        job.update(current_step=1)
        # Get codes and create mapping
        codes, classid2labelid, code2parent, id2label = self._build_label_mappings(
            db=db,
            class_ids=parameters.class_ids,
            merge_children_into_parent=merge_children_into_parent,
        )
        class_ids = list(classid2labelid.keys())

        # Build dataset
        user_id2sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            class_ids=class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
            use_chunking=True,
        )
        if len(dataset) == 0:
            raise EmptyDatasetError()

        # Train test split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)

        def split_in_chunks(examples: dict):
            chunk_len = tokenizer.model_max_length - 2
            for key, values in examples.items():
                if "labels" == key:
                    pre = [IGNORE_LABEL_ID]
                    post = [IGNORE_LABEL_ID]
                elif "attention_mask" == key:
                    pre = [1]
                    post = [1]
                elif "input_ids" == key:
                    pre = [tokenizer.added_tokens_encoder["[CLS]"]]
                    post = [tokenizer.added_tokens_encoder["[SEP]"]]
                else:
                    raise ValueError(f"Unsupported {key} in batch examples dict")

                result = []
                for val in values:
                    chunks = [
                        pre + val[i : i + chunk_len] + post
                        for i in range(0, len(val), chunk_len)
                    ]
                    result.extend(chunks)
                examples[key] = result
            return examples

        train_dataset = (
            split_dataset["train"]
            .remove_columns(["sdoc_id", "user_id"])
            .map(split_in_chunks, batched=True)
        )
        val_dataset = (
            split_dataset["test"]
            .remove_columns(["sdoc_id", "user_id"])
            .map(split_in_chunks, batched=True)
        )

        train_dataloader = DataLoader(
            train_dataset,  # type: ignore
            shuffle=True,
            collate_fn=data_collator,
            batch_size=parameters.batch_size,
            pin_memory=True,
        )
        val_dataloader = DataLoader(
            val_dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=parameters.batch_size,
            pin_memory=True,
        )

        # Dataset statistics (number of annotations per code)
        train_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for sdoc_id, user_id in zip(
            split_dataset["train"]["sdoc_id"], split_dataset["train"]["user_id"]
        ):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                train_dataset_stats[code2parent[annotation.code_id]] += 1

        eval_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for sdoc_id, user_id in zip(
            split_dataset["test"]["sdoc_id"], split_dataset["test"]["user_id"]
        ):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[code2parent[annotation.code_id]] += 1

        # Calculate class weights
        # Count the occurrences of each label in the training set
        label_counts = defaultdict(int)
        for labels in split_dataset["train"]["labels"]:
            for label in labels:
                if label != IGNORE_LABEL_ID:  # Ignore padding tokens
                    label_counts[label] += 1

        # Calculate the weight for each label: A simple inverse frequency weighting
        total_tokens = sum(label_counts.values())
        num_labels = len(id2label)
        class_weights = [0.0] * num_labels
        for label, count in label_counts.items():
            if count > 0:
                class_weights[label] = total_tokens / (num_labels * count)
            else:
                raise ValueError(f"Label '{label}' has zero count in training data!")

        # 2. Initialize PyTorch Lightning components
        job.update(current_step=2)

        # Create the Trainer
        model_name: str = str(uuid4())
        model_dir = FilesystemRepo().get_model_dir(
            proj_id=payload.project_id,
            model_name=model_name,
            model_prefix="span_classifier_",
        )

        log_dir = model_dir / "train_logs"
        csv_logger = CSVLogger(log_dir, name=f"span_classifier_{model_name}")

        callbacks = []
        checkpoint_callback = ModelCheckpoint(
            dirpath=str(model_dir.absolute()),
            monitor="eval_f1",
            mode="max",
            save_top_k=1,
        )
        callbacks.append(checkpoint_callback)

        if parameters.early_stopping:
            early_stopping_callback = EarlyStopping(
                monitor="eval_f1",
                mode="max",
                patience=3,  # Wait for 3 epochs
            )
            callbacks.append(early_stopping_callback)

        # append our own, custom callback to update the job progress
        callbacks.append(JobProgressCallback(job=job))

        trainer = pl.Trainer(
            logger=csv_logger,
            max_epochs=parameters.epochs,
            callbacks=callbacks,
            enable_progress_bar=True,
            precision=parameters.precision,
            devices=[torch.cuda.current_device()],
            # Special params
            # gradient_clip_val=1.0,  # Gradient clipping
        )

        with trainer.init_module():
            # Initialize the Lightning Model
            lightning_model = SpanClassificationLightningModel(
                base_name=parameters.base_name,
                num_labels=len(id2label),
                dropout=parameters.dropout,
                learning_rate=parameters.learning_rate,
                weight_decay=parameters.weight_decay,
                class_weights=class_weights,
                id2label=id2label,
                label2id={v: k for k, v in id2label.items()},
                averaging=parameters.averaging.value,
            )

        # 3. Train the model
        job.update(current_step=3)
        lightning_model.train()
        trainer.fit(
            lightning_model,
            train_dataloaders=train_dataloader,
            val_dataloaders=val_dataloader,
        )

        # 4. Evaluate the best model
        job.update(current_step=4)
        best_model = SpanClassificationLightningModel.load_from_checkpoint(
            checkpoint_callback.best_model_path
        )
        best_model.eval()
        eval_results = trainer.validate(best_model, dataloaders=val_dataloader)[0]

        # 5. Retrieve training statistics from the logs
        job.update(current_step=5)
        metrics_df = pd.read_csv(csv_logger.log_dir + "/metrics.csv")
        # filter out all rows where train_loss is NaN
        train_df = metrics_df[metrics_df["train_loss"].notna()]
        # read the columns "epoch" and "train_loss"
        train_loss_df = train_df[["epoch", "train_loss"]]
        # convert to a list that contains dicts of {"epoch": 0, "train_loss": 1}, ... etc
        train_loss_list = train_loss_df.to_dict(orient="records")  # type: ignore

        # 6. Store results
        job.update(current_step=6)
        # 6.1 store the classifier in the db
        classifier = crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model=parameters.base_name,
                type=payload.model_type,
                path=checkpoint_callback.best_model_path or "ERROR!",
                project_id=payload.project_id,
                labelid2classid={v: code2parent[k] for k, v in classid2labelid.items()},
                train_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in train_dataset_stats.items()
                ],
                train_loss=[
                    ClassifierLoss(step=x["epoch"], value=x["train_loss"])
                    for x in train_loss_list
                ],
                train_params=parameters.get_train_params(),
            ),
            codes=codes,
            tags=[],
        )

        # 6.2 store the evaluation in the db
        labelid2classid = {v: code2parent[k] for k, v in classid2labelid.items()}
        classifier_db_obj = crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=classifier.id,
                f1=eval_results["eval_f1"],
                precision=eval_results["eval_precision"],
                recall=eval_results["eval_recall"],
                accuracy=eval_results["eval_accuracy"],
                eval_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in eval_dataset_stats.items()
                ],
                class_metrics=[
                    ClassifierClassMetrics(
                        class_id=labelid2classid[m["label_id"]],
                        precision=m["precision"],
                        recall=m["recall"],
                        f1=m["f1"],
                        support=m["support"],
                    )
                    for m in best_model._last_class_metrics
                ],
            ),
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.TRAINING,
            task_output=ClassifierTrainingOutput(
                task_type=ClassifierTask.TRAINING,
                classifier=ClassifierRead.model_validate(classifier_db_obj),
            ),
        )

    def eval(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierEvaluationParams), (
            "Expected eval parameters!"
        )

        job.update(
            steps=[
                "Started classifier job",
                "Read classifier",
                "Creating dataset",
                "Loading model",
                "Evaluating model",
                "Storing results",
            ]
        )

        # 1. Get the trained classifier and its label mappings from the database
        job.update(current_step=1)
        classifier = crud_classifier.read(db=db, id=parameters.classifier_id)
        classid2labelid = {v: int(k) for k, v in classifier.labelid2classid.items()}
        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        # 2. Create dataset
        job.update(current_step=2)

        # Build dataset
        user_id2sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            class_ids=classifier.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
            use_chunking=False,
        )
        if len(dataset) == 0:
            raise EmptyDatasetError()

        # Build dataloader
        test_dataloader = DataLoader(
            dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # Dataset statistics (number of annotations per code)
        eval_dataset_stats: dict[int, int] = {
            code_id: 0
            for code_id, label_id in classid2labelid.items()
            if label_id != O_LABEL_ID
        }
        for sdoc_id, user_id in zip(dataset["sdoc_id"], dataset["user_id"]):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Load the model
        job.update(current_step=3)
        model = SpanClassificationLightningModel.load_from_checkpoint(classifier.path)
        # Resolve the averaging strategy: eval param overrides the model's stored
        # training setting (default micro for older models).
        model.averaging = (
            parameters.averaging.value
            if parameters.averaging is not None
            else classifier.train_params.get(
                "averaging", ClassifierAveraging.MICRO.value
            )
        )
        model.eval()

        # 4. Eval model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "eval_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(
            logger=csv_logger,
            devices=[torch.cuda.current_device()],
        )
        eval_results = trainer.test(model, dataloaders=test_dataloader)[0]

        # 5. Store the evaluation in the DB
        job.update(current_step=5)
        labelid2classid = {v: k for k, v in classid2labelid.items()}
        classifier_db_obj = crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=classifier.id,
                f1=eval_results["test_f1"],
                precision=eval_results["test_precision"],
                recall=eval_results["test_recall"],
                accuracy=eval_results["test_accuracy"],
                eval_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in eval_dataset_stats.items()
                ],
                class_metrics=[
                    ClassifierClassMetrics(
                        class_id=labelid2classid[m["label_id"]],
                        precision=m["precision"],
                        recall=m["recall"],
                        f1=m["f1"],
                        support=m["support"],
                    )
                    for m in model._last_class_metrics
                ],
            ),
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.EVALUATION,
            task_output=ClassifierEvaluationOutput(
                task_type=ClassifierTask.EVALUATION,
                evaluation=ClassifierEvaluationRead.model_validate(
                    classifier_db_obj.evaluations[-1]
                ),
            ),
        )

    def infer(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierInferenceParams), (
            "Expected inference parameters!"
        )

        job.update(
            steps=[
                "Started classifier job",
                "Read classifier",
                "Creating dataset",
                "Loading model",
                "Predicting with model",
                "Post-processing the results",
                "Storing results",
            ]
        )

        # 1. Get the trained classifier and its label mappings from the database
        job.update(current_step=1)
        classifier = crud_classifier.read(db=db, id=parameters.classifier_id)
        labelid2classid = {
            int(label): c for label, c in classifier.labelid2classid.items()
        }

        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        # Delete existing annotations (if requested by the user)
        if parameters.delete_existing_work:
            crud_span_anno.remove_by_user_sdocs_codes(
                db=db,
                user_id=ASSISTANT_TRAINED_ID,
                sdoc_ids=parameters.sdoc_ids,
                code_ids=classifier.class_ids,
            )

        # 2. Create dataset
        job.update(current_step=2)
        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=parameters.sdoc_ids)
        sdoc_id2data = {sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas}
        inference_dataset: list[InferenceDatasetRow] = [
            {"sdoc_id": sdoc_data.id, "words": sdoc_data.tokens}
            for sdoc_data in sdoc_datas
        ]

        # Construct a tokenized huggingface dataset. Long documents are split
        # into overlapping chunks (return_overflowing_tokens) so that no tokens
        # are silently dropped; per-chunk predictions are merged back below.
        # chunk_index -> (sdoc_id, word_ids of that chunk)
        chunk_meta: list[tuple[int, list[int | None]]] = []
        # Number of words per sdoc, to size the merged prediction arrays.
        sdoc_id2num_words: dict[int, int] = {
            sdoc_data.id: len(sdoc_data.tokens) for sdoc_data in sdoc_datas
        }

        # Stride between consecutive chunks (in tokens) so spans near a chunk
        # boundary are fully visible in at least one chunk.
        chunk_stride = max(1, tokenizer.model_max_length // 4)

        def tokenize_for_inference(examples):
            tokenized_inputs = tokenizer(
                examples["words"],
                truncation=True,
                is_split_into_words=True,
                return_overflowing_tokens=True,
                stride=chunk_stride,
            )

            overflow_mapping = tokenized_inputs.pop("overflow_to_sample_mapping")
            num_chunks = len(tokenized_inputs["input_ids"])
            for chunk_i in range(num_chunks):
                sample_i = overflow_mapping[chunk_i]
                sdoc_id = examples["sdoc_id"][sample_i]
                word_ids = tokenized_inputs.word_ids(batch_index=chunk_i)
                chunk_meta.append((sdoc_id, word_ids))

            return tokenized_inputs

        hf_dataset = Dataset.from_list(inference_dataset)  # type: ignore
        tokenized_hf_dataset = hf_dataset.map(
            tokenize_for_inference,
            batched=True,
            remove_columns=hf_dataset.column_names,
            # chunk_meta is populated as a side effect, so caching must be off
            # (a cache hit would skip the function and leave chunk_meta empty).
            load_from_cache_file=False,
        )
        # Align each chunk with its metadata via a positional index.
        tokenized_hf_dataset = tokenized_hf_dataset.add_column(
            "chunk_idx", list(range(len(tokenized_hf_dataset)))
        )

        # Build dataloader
        inference_dataloader = DataLoader(
            tokenized_hf_dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # 3. Load the model
        job.update(current_step=3)
        model = SpanClassificationLightningModel.load_from_checkpoint(
            classifier.path,
        )
        model.eval()

        # 4. Predict with model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "infer_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(
            logger=csv_logger,
            devices=[torch.cuda.current_device()],
        )
        predictions = trainer.predict(model, dataloaders=inference_dataloader)
        assert predictions is not None, "No predictions returned!"

        # 5. Post-process the predictions to extract annotations
        job.update(current_step=5)
        # Flatten the per-chunk outputs.
        flat_chunk_idxs: list[int] = []
        flat_predictions: list[list[int]] = []
        for pred in predictions:
            flat_chunk_idxs.extend([x.item() for x in pred["chunk_idxs"]])  # type: ignore
            flat_predictions.extend(pred["predictions"])  # type: ignore

        # Merge the overlapping per-chunk token predictions into one word-level
        # label array per document. The first chunk that covers a word wins.
        sdoc_id2word_labels: dict[int, list[int]] = {
            sdoc_id: [O_LABEL_ID] * num_words
            for sdoc_id, num_words in sdoc_id2num_words.items()
        }
        sdoc_id2word_seen: dict[int, set[int]] = defaultdict(set)
        for chunk_idx, chunk_preds in zip(flat_chunk_idxs, flat_predictions):
            sdoc_id, word_ids = chunk_meta[chunk_idx]
            word_labels = sdoc_id2word_labels[sdoc_id]
            seen = sdoc_id2word_seen[sdoc_id]
            for word_id, label in zip(word_ids, chunk_preds):
                # Skip special tokens and already-covered words.
                if word_id is None or word_id in seen:
                    continue
                seen.add(word_id)
                word_labels[word_id] = label

        # Extract spans from the merged word-level labels of each document.
        # end_token is EXCLUSIVE (matches the training labels[begin:end] slice
        # convention and SpanAnnotation.end_token semantics).
        results: list[AnnotationResult] = []
        for sdoc_id, word_labels in sdoc_id2word_labels.items():
            prev_label = O_LABEL_ID
            current_annotation: AnnotationResult | None = None

            for word_id, label in enumerate(word_labels):
                if label != prev_label:
                    # The current annotation ends (word_id is the first word
                    # after the span -> exclusive end).
                    if current_annotation is not None:
                        current_annotation["end_token"] = word_id
                        results.append(current_annotation)
                        current_annotation = None

                    # A new annotation starts
                    if label != O_LABEL_ID:
                        current_annotation = {
                            "sdoc_id": sdoc_id,
                            "begin_token": word_id,
                            "class_id": labelid2classid[label],
                            "end_token": -1,
                        }

                prev_label = label

            # Finish the current annotation at the end of the document. The
            # exclusive end is one past the last word.
            if current_annotation is not None:
                current_annotation["end_token"] = len(word_labels)
                results.append(current_annotation)

        # 6. Store annotations in DB
        job.update(current_step=6)
        # Convert to DTOs (and compute statistics)
        create_dtos: list[SpanAnnotationCreate] = []
        result_statistics: dict[int, int] = defaultdict(
            int
        )  # map from code_id to number of annotations
        affected_sdoc_ids: set[int] = set()
        for annotation in results:
            sdoc_data = sdoc_id2data[annotation["sdoc_id"]]
            begin_char = sdoc_data.token_starts[annotation["begin_token"]]
            # end_token is exclusive, so the last covered word is end_token - 1.
            end_char = sdoc_data.token_ends[annotation["end_token"] - 1]
            create_dtos.append(
                SpanAnnotationCreate(
                    begin=begin_char,
                    end=end_char,
                    begin_token=annotation["begin_token"],
                    end_token=annotation["end_token"],
                    span_text=sdoc_data.content[begin_char:end_char],
                    code_id=annotation["class_id"],
                    sdoc_id=annotation["sdoc_id"],
                )
            )
            result_statistics[annotation["class_id"]] += 1
            affected_sdoc_ids.add(annotation["sdoc_id"])

        # Write to db
        crud_span_anno.create_bulk(
            db=db, user_id=ASSISTANT_TRAINED_ID, create_dtos=create_dtos
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
                result_statistics=[
                    ClassifierData(class_id=class_id, num_examples=count)
                    for class_id, count in result_statistics.items()
                ],
                total_affected_docs=len(affected_sdoc_ids),
            ),
        )
