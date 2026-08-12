from collections import defaultdict
from pathlib import Path
from typing import Any, Literal, NamedTuple, TypedDict, cast
from uuid import uuid4

import numpy as np
import pandas as pd
import pytorch_lightning as pl
import torch
import torch.nn as nn
from datasets import Dataset
from loguru import logger
from peft import TaskType
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint
from pytorch_lightning.loggers import CSVLogger
from pytorch_lightning.utilities.types import OptimizerLRSchedulerConfig
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import batch_to_device
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sqlalchemy import select
from sqlalchemy.orm import Session
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence, pad_sequence
from torch.utils.data import DataLoader
from torchcrf import CRF

from config import conf
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
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
    EmptyEvaluationError,
    NoCheckpointError,
)
from modules.classifier.models.job_progress_callback import JobProgressCallback
from modules.classifier.models.lora_utils import build_lora_config
from modules.classifier.models.model_utils import (
    O_LABEL_ID,
    build_code_label_mappings,
    check_hf_model_exists,
    compute_balanced_class_weights,
    grouped_train_test_split,
)
from modules.classifier.models.optimizer_utils import configure_classifier_optimizer
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job

SQL_BATCH_SIZE = conf.postgres.batch_size


class DatasetRow(TypedDict):
    user_id: int
    labels: list[int]
    sdoc_id: int
    sentences: list[str]


class AnnotationResult(TypedDict):
    begin: int
    end: int
    class_id: int
    sdoc_id: int


class SentenceClassifierOutput(NamedTuple):
    loss: torch.Tensor | None
    predictions: list[list[int]] | None


class SentClassificationLightningModel(pl.LightningModule):
    def __init__(
        self,
        num_labels: int,
        dropout: float,
        base_learning_rate: float,
        head_learning_rate: float,
        warmup_fraction: float,
        weight_decay: float,
        class_weights: list[float],
        # special params
        embedding_model_name: str,
        use_lstm: bool,
        freeze_base_model: bool,
        lora_enabled: bool,
        lora_rank: int,
        lora_alpha: int,
        lora_dropout: float,
        id2label: dict[int, str] | None = None,
        label2id: dict[str, int] | None = None,
        averaging: Literal["micro", "macro"] = ClassifierAveraging.MICRO.value,
    ):
        super().__init__()
        # Saves hyperparameters to the checkpoint
        self.save_hyperparameters()

        # Load the sentence embedding model as part of the trainable pipeline.
        self.embedding_model = SentenceTransformer(embedding_model_name)
        resolved_embedding_dim = self.embedding_model.get_embedding_dimension()
        if resolved_embedding_dim is None:
            raise ValueError(
                f"Could not determine embedding dimension of model '{embedding_model_name}'"
            )
        self.embedding_dim = resolved_embedding_dim
        self.freeze_base_model = freeze_base_model
        self.lora_enabled = lora_enabled
        if lora_enabled:
            self.embedding_model.add_adapter(
                build_lora_config(
                    rank=lora_rank,
                    alpha=lora_alpha,
                    dropout=lora_dropout,
                    task_type=TaskType.FEATURE_EXTRACTION,
                )
            )
        elif freeze_base_model:
            for parameter in self.embedding_model.parameters():
                parameter.requires_grad = False

        hidden_dim = int(self.embedding_dim / 2)

        if use_lstm:
            self.lstm = nn.LSTM(
                self.embedding_dim,
                hidden_dim,
                batch_first=True,
                bidirectional=True,
                dropout=dropout,
            )
            linear_input_dim = 2 * hidden_dim
        else:
            linear_input_dim = self.embedding_dim
            self.lstm = None

        self.linear = nn.Linear(linear_input_dim, num_labels)
        self.crf = CRF(num_labels, batch_first=True)
        self.loss_fn = nn.CrossEntropyLoss(
            weight=torch.tensor(class_weights, dtype=torch.float)
        )

        # Store params
        self.num_labels = num_labels
        self.dropout = dropout
        self.base_learning_rate = base_learning_rate
        self.head_learning_rate = head_learning_rate
        self.warmup_fraction = warmup_fraction
        self.weight_decay = weight_decay
        self.class_weights = class_weights
        self.embedding_model_name = embedding_model_name
        self.hidden_dim = hidden_dim
        self.use_lstm = use_lstm
        self.id2label = id2label
        self.label2id = label2id
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

    def forward(
        self,
        sentences: list[list[str]],
        mask: torch.Tensor | None = None,
        labels: torch.Tensor | None = None,
        decode: bool = True,
        **kwargs,
    ) -> SentenceClassifierOutput:
        assert mask is not None, "Mask must be provided"
        sentence_counts = [len(document_sentences) for document_sentences in sentences]
        flat_sentences = [
            sentence
            for document_sentences in sentences
            for sentence in document_sentences
        ]
        tokenized_sentences = batch_to_device(
            self.embedding_model.preprocess(flat_sentences),
            self.device,
        )
        if self.freeze_base_model and not self.lora_enabled:
            with torch.no_grad():
                sentence_embeddings = self.embedding_model(tokenized_sentences)[
                    "sentence_embedding"
                ]
        else:
            sentence_embeddings = self.embedding_model(tokenized_sentences)[
                "sentence_embedding"
            ]
        padded_embeddings = pad_sequence(
            list(torch.split(sentence_embeddings, sentence_counts)),
            batch_first=True,
            padding_value=0,
        )

        if self.lstm:
            lengths = mask.sum(dim=1).tolist()  # Calculate lengths of valid sequences
            packed_embeddings = pack_padded_sequence(
                padded_embeddings, lengths, batch_first=True, enforce_sorted=False
            )
            packed_output, _ = self.lstm(
                packed_embeddings
            )  # Pass packed sequence to LSTM
            padded_embeddings, _ = pad_packed_sequence(
                packed_output, batch_first=True
            )  # Unpack the output

        emissions = self.linear(padded_embeddings)
        if labels is not None:
            crf_loss = -self.crf(
                emissions,
                labels,
                mask=mask,
                # Average over valid sentences, excluding padding.
                reduction="token_mean",
            )
            # torchcrf has no class-weight argument. Add weighted token-level
            # cross-entropy so rare classes influence the emission scores while
            # the CRF loss continues to train sequence transitions.
            class_loss = self.loss_fn(emissions[mask], labels[mask])
            loss = crf_loss + class_loss
        else:
            loss = None
        # torchcrf accepts boolean masks, although its decode stub only declares
        # ByteTensor.
        predictions = (
            self.crf.decode(
                emissions,
                mask=mask,  # pyright: ignore[reportArgumentType]
            )
            if decode
            else None
        )
        return SentenceClassifierOutput(loss=loss, predictions=predictions)

    def train(self, mode: bool = True):
        super().train(mode)
        if self.freeze_base_model and not self.lora_enabled:
            self.embedding_model.eval()
        return self

    def training_step(self, batch, batch_idx):
        output = self.forward(**batch, decode=False)
        assert output.loss is not None, "Training requires labels"

        self.log("train_loss", output.loss, on_step=False, on_epoch=True)
        return output.loss

    def _val_test_step(self, prefix: str, batch, batch_idx: int) -> torch.Tensor:
        output = self.forward(**batch)
        assert output.loss is not None, "Evaluation requires labels"
        assert output.predictions is not None, "Evaluation requires predictions"

        mask = batch["mask"]
        labels = batch["labels"]
        golds = []
        for i in range(len(labels)):  # Iterate over the batch
            golds.append(labels[i][mask[i] == 1].tolist())

        # Accumulate token-level predictions/labels so that metrics can be
        # computed once over the whole epoch.
        flat_preds = [p for prediction in output.predictions for p in prediction]
        flat_labels = [g for gold in golds for g in gold]
        if prefix == "eval":
            self._val_preds.extend(flat_preds)
            self._val_labels.extend(flat_labels)
        else:
            self._test_preds.extend(flat_preds)
            self._test_labels.extend(flat_labels)

        # Log loss
        self.log(f"{prefix}_loss", output.loss, on_step=False, on_epoch=True)
        return output.loss

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
    def validation_step(self, batch, batch_idx):
        return self._val_test_step(
            prefix="eval",
            batch=batch,
            batch_idx=batch_idx,
        )

    @torch.no_grad()
    def test_step(self, batch, batch_idx):
        return self._val_test_step(
            prefix="test",
            batch=batch,
            batch_idx=batch_idx,
        )

    @torch.no_grad()
    def predict_step(self, batch: dict[str, Any], batch_idx: int) -> Any:
        # Get predictions and ground truth tags
        output = self.forward(sentences=batch["sentences"], mask=batch["mask"])
        assert output.predictions is not None, "Prediction requires decoded output"

        return {
            "sdoc_ids": batch["sdoc_id"],
            "predictions": output.predictions,
        }

    def configure_optimizers(self) -> OptimizerLRSchedulerConfig:
        return configure_classifier_optimizer(
            model=self,
            base_model=self.embedding_model,
            freeze_base_model=self.freeze_base_model,
            base_learning_rate=self.base_learning_rate,
            head_learning_rate=self.head_learning_rate,
            weight_decay=self.weight_decay,
            warmup_fraction=self.warmup_fraction,
            total_steps=int(self.trainer.estimated_stepping_batches),
        )


class SentClassificationModelService(TextClassificationModelService):
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
        # Build the flat label mappings over the user-selected classes.
        codes, codeid2labelid, _ = build_code_label_mappings(
            db=db,
            code_ids=class_ids,
        )

        # Build labeled sentence sequences and collect the selected documents
        # that have no matching annotations.
        _, dataset, unannotated_sdocs = self._retrieve_and_build_dataset(
            db=db,
            project_id=project_id,
            tag_ids=tag_ids,
            user_ids=user_ids,
            codeid2labelid=codeid2labelid,
            merge_children_into_parent=merge_children_into_parent,
        )

        # Compute statistics from the sentence-level labels (before splitting)
        labelid2codeid = {v: k for k, v in codeid2labelid.items()}
        class_units: dict[int, int] = {code.id: 0 for code in codes}
        class_examples: dict[int, int] = {code.id: 0 for code in codes}
        total_units = 0
        labeled_units = 0
        problematic_sdocs: list[ProblematicSdoc] = []

        for row in cast(list[DatasetRow], dataset):
            labels: list[int] = row["labels"]
            row_total = len(labels)
            row_labeled = 0
            seen_classes: set[int] = set()
            for label in labels:
                if label != O_LABEL_ID:
                    row_labeled += 1
                    class_id = labelid2codeid[label]
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
            unannotated_sdocs=unannotated_sdocs,
        )

    def _retrieve_and_build_dataset(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        user_ids: list[int],
        codeid2labelid: dict[int, int],
        merge_children_into_parent: bool = False,
    ) -> tuple[dict[int, dict[int, list[SentenceAnnotationORM]]], Dataset, list[int]]:
        """Build the sentence-classification dataset from tags and annotators.

        First, fetch every source document carrying one of ``tag_ids``. Then fetch
        annotations from the selected ``user_ids`` whose codes are selected for
        this classifier. One dataset row is created per matching
        annotator/document combination, so a document annotated by two selected
        annotators appears twice. Documents without a matching annotation are
        excluded. Documents whose source data is missing or contains no sentences
        are excluded before annotations are retrieved.

        For example, suppose the provided tag selects documents 1, 2, and 3.
        Annotator A annotated documents 1 and 2, and annotator B annotated
        document 2. The dataset contains rows A/1, A/2, and B/2. Document 2
        occurs twice, while untouched document 3 is excluded.

        Finally, annotations for the selected codes are written into each row;
        all other sentences remain O. When ``merge_children_into_parent`` is
        true, descendant-code annotations are mapped to their selected parent.
        If annotations with different selected classes overlap, the class that
        appears earlier in the selected ``class_ids`` wins the conflicting
        sentences.

        Returns the annotations grouped by annotator and document, a Hugging Face
        dataset containing the sentence text and labels for every included row,
        and the sorted IDs of tag-selected documents excluded because they have
        no matching annotation.
        """

        # Expand which code ids to fetch:
        # If merge_children_into_parent is True, fetch all descendants of the selected classes and remap their annotations to the parent class.
        # If merge_children_into_parent is False, fetch only the selected classes and keep their annotations as-is.
        code_ids = [c for c in codeid2labelid.keys() if c != O_LABEL_ID]
        if merge_children_into_parent:
            codeid2parentid: dict[int, int] = {}
            for code_id in code_ids:
                for code in crud_code.read_with_children(db, code_id=code_id):
                    codeid2parentid[code.id] = code_id
        else:
            codeid2parentid = {code_id: code_id for code_id in code_ids}

        # Find documents
        sdoc_ids = [
            sdoc.id
            for sdoc in crud_sdoc.read_by_tags(
                db=db,
                project_id=project_id,
                tag_ids=tag_ids,
            )
        ]

        # Sentence models require at least one sentence per row. Filter unusable
        # documents before retrieving annotations so they cannot reach collation,
        # sequence packing, or the CRF.
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)
        sdocid2data = {
            sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas if sdoc_data.sentences
        }
        excluded_sdoc_count = len(sdoc_ids) - len(sdocid2data)
        if excluded_sdoc_count > 0:
            logger.warning(
                f"Excluding {excluded_sdoc_count} source documents with missing or "
                "empty sentence data from the sentence-classification dataset."
            )
        sdoc_ids = [sdoc_id for sdoc_id in sdoc_ids if sdoc_id in sdocid2data]

        user_id2sdoc_id2annotations: dict[
            int, dict[int, list[SentenceAnnotationORM]]
        ] = defaultdict(lambda: defaultdict(list))

        # 2. retrieve annotations from the database, in batches
        for i in range(0, len(sdoc_ids), SQL_BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + SQL_BATCH_SIZE]

            stmt = (
                select(
                    SentenceAnnotationORM,
                    AnnotationDocumentORM,
                )
                .join(SentenceAnnotationORM.annotation_document)
                .where(
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    SentenceAnnotationORM.code_id.in_(list(codeid2parentid.keys())),
                )
            )

            batch_result = db.execute(stmt).all()
            for result_row in batch_result:
                annotation, adoc = result_row._tuple()
                # Detach the ORM object from the session before mutating it.
                db.expunge(annotation)
                annotation.code_id = codeid2parentid[annotation.code_id]
                user_id2sdoc_id2annotations[adoc.user_id][
                    adoc.source_document_id
                ].append(annotation)

        included_sdoc_ids = {
            sdoc_id
            for sdoc_id2annotations in user_id2sdoc_id2annotations.values()
            for sdoc_id in sdoc_id2annotations
        }
        unannotated_sdocs = sorted(set(sdoc_ids) - included_sdoc_ids)

        # Overlay annotations onto all-O sentence labels.
        dataset: list[DatasetRow] = []
        for user_id, sdoc_id2annotations in user_id2sdoc_id2annotations.items():
            for sdoc_id, annotations in sdoc_id2annotations.items():
                sdoc_data = sdocid2data[sdoc_id]
                sentences = sdoc_data.sentences
                labels = [O_LABEL_ID for _ in sentences]
                # Apply lower-priority classes first so the class appearing
                # earlier in class_ids (lower label ID) deterministically wins
                # overlapping sentences.
                annotations.sort(
                    key=lambda annotation: (
                        codeid2labelid[annotation.code_id],
                        annotation.id,
                    )
                )
                for annotation in reversed(annotations):
                    # sentence_id_end is INCLUSIVE, so the slice end is +1.
                    labels[
                        annotation.sentence_id_start : annotation.sentence_id_end + 1
                    ] = [codeid2labelid[annotation.code_id]] * (
                        annotation.sentence_id_end - annotation.sentence_id_start + 1
                    )

                row: DatasetRow = {
                    "sdoc_id": sdoc_data.id,
                    "user_id": user_id,
                    "labels": labels,
                    "sentences": sentences,
                }
                dataset.append(row)

        # Construct the Hugging Face dataset from the collected rows.
        if len(dataset) == 0:
            logger.warning(
                "The sentence classification dataset is empty (no matching documents or annotations)."
            )
            empty_columns: dict[str, list] = {
                "sdoc_id": [],
                "user_id": [],
                "labels": [],
                "sentences": [],
            }
            return (
                user_id2sdoc_id2annotations,
                Dataset.from_dict(empty_columns),
                unannotated_sdocs,
            )

        hf_dataset = Dataset.from_list(dataset)  # type: ignore

        return user_id2sdoc_id2annotations, hf_dataset, unannotated_sdocs

    def _collate_fn(self, batch):
        sentences = [b["sentences"] for b in batch]
        labels = [torch.tensor(b["labels"]) for b in batch]
        sdoc_ids = [b["sdoc_id"] for b in batch]
        user_ids = [b["user_id"] for b in batch]

        # Pad labels
        padded_labels = pad_sequence(labels, batch_first=True, padding_value=O_LABEL_ID)

        # Create mask
        mask = torch.zeros(padded_labels.shape, dtype=torch.bool)
        for i, label in enumerate(labels):
            mask[i, : len(label)] = 1

        return {
            "sentences": sentences,
            "labels": padded_labels,
            "mask": mask,
            "sdoc_id": torch.tensor(sdoc_ids),
            "user_id": torch.tensor(user_ids),
        }

    def train(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # 0. Check inputs
        # Does the provided model exist
        if not check_hf_model_exists(parameters.base_name):
            raise BaseModelDoesNotExistError(parameters.base_name)

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
        # Build the flat label mappings over the user-selected classes.
        codes, codeid2labelid, labelid2name = build_code_label_mappings(
            db=db,
            code_ids=parameters.class_ids,
        )

        # Build one labeled sentence sequence per annotator/document pair.
        user_id2sdoc_id2annotations, dataset, _ = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            codeid2labelid=codeid2labelid,
            merge_children_into_parent=parameters.merge_children_into_parent,
        )

        if len(dataset) == 0:
            raise EmptyDatasetError()

        # Choose the best class-balanced split grouped by source document.
        train_idx, test_idx = grouped_train_test_split(
            dataset,
            test_size=parameters.train_test_split,
        )
        train_dataset = dataset.select(train_idx)
        val_dataset = dataset.select(test_idx)

        train_dataloader = DataLoader(
            train_dataset,  # type: ignore
            shuffle=True,
            collate_fn=self._collate_fn,
            batch_size=parameters.batch_size,
        )
        val_dataloader = DataLoader(
            val_dataset,  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=parameters.batch_size,
        )

        # Dataset statistics (number of annotations per code).
        # Pull the columns once; per-row `dataset[i]` access on a HF Dataset is slow.
        dataset_sdoc_ids = dataset["sdoc_id"]
        dataset_user_ids = dataset["user_id"]

        train_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for i in train_idx:
            user_id = dataset_user_ids[i]
            for annotation in user_id2sdoc_id2annotations[user_id][dataset_sdoc_ids[i]]:
                train_dataset_stats[annotation.code_id] += 1

        eval_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for i in test_idx:
            user_id = dataset_user_ids[i]
            for annotation in user_id2sdoc_id2annotations[user_id][dataset_sdoc_ids[i]]:
                eval_dataset_stats[annotation.code_id] += 1

        # Compute inverse-frequency weights over the sentence labels that
        # contribute to the training objective.
        train_labels = cast(list[list[int]], train_dataset["labels"])
        class_weights = compute_balanced_class_weights(
            (label for labels in train_labels for label in labels),
            num_labels=len(labelid2name),
        )

        # 2. Initialize PyTorch Lightning components
        job.update(current_step=2)

        # Create the Trainer
        model_name: str = str(uuid4())
        model_dir = FilesystemRepo().get_model_dir(
            proj_id=payload.project_id,
            model_name=model_name,
            model_prefix="sent_classifier",
        )

        log_dir = model_dir / "train_logs"
        csv_logger = CSVLogger(log_dir, name=f"sent_classifier{model_name}")

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
                patience=parameters.early_stopping_patience,
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
            lightning_model = SentClassificationLightningModel(
                embedding_model_name=parameters.base_name,
                use_lstm=True,
                freeze_base_model=parameters.freeze_base_model,
                lora_enabled=parameters.lora_enabled,
                lora_rank=parameters.lora_rank,
                lora_alpha=parameters.lora_alpha,
                lora_dropout=parameters.lora_dropout,
                num_labels=len(labelid2name),
                dropout=parameters.dropout,
                base_learning_rate=parameters.base_learning_rate,
                head_learning_rate=parameters.head_learning_rate,
                warmup_fraction=parameters.warmup_fraction,
                weight_decay=parameters.weight_decay,
                class_weights=class_weights,
                id2label=labelid2name,
                label2id={v: k for k, v in labelid2name.items()},
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
        if not checkpoint_callback.best_model_path:
            raise NoCheckpointError()
        best_model = SentClassificationLightningModel.load_from_checkpoint(
            checkpoint_callback.best_model_path,
        )
        best_model.eval()
        eval_results = trainer.validate(best_model, dataloaders=val_dataloader)[0]
        # When the eval split contains no entity tokens, no metrics are logged
        # (the metric hook returns early), so the keys are missing.
        if "eval_f1" not in eval_results:
            raise EmptyEvaluationError()

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
                path=checkpoint_callback.best_model_path,
                project_id=payload.project_id,
                labelid2classid={v: k for k, v in codeid2labelid.items()},
                train_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in train_dataset_stats.items()
                ],
                train_loss=[
                    ClassifierLoss(step=x["epoch"], value=x["train_loss"])
                    for x in train_loss_list
                ],
                train_params=parameters.get_training_settings(),
            ),
            codes=codes,
            tags=[],
        )

        # 6.2 store the evaluation in the db
        labelid2codeid = {v: k for k, v in codeid2labelid.items()}
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
                        class_id=labelid2codeid[m["label_id"]],
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
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
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
        codeid2labelid = {v: int(k) for k, v in classifier.labelid2classid.items()}

        # 2. Create dataset
        job.update(current_step=2)

        # Build one labeled sentence sequence per annotator/document pair.
        user_id2sdoc_id2annotations, dataset, _ = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            codeid2labelid=codeid2labelid,
            merge_children_into_parent=parameters.merge_children_into_parent,
        )

        if len(dataset) == 0:
            raise EmptyDatasetError()

        # Build dataloader
        test_dataloader = DataLoader(
            dataset,  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=classifier.train_params["batch_size"],
        )

        # Dataset statistics (number of annotations per code).
        eval_dataset_stats: dict[int, int] = {
            code_id: 0
            for code_id, label_id in codeid2labelid.items()
            if label_id != O_LABEL_ID
        }
        for sdoc_id, user_id in zip(dataset["sdoc_id"], dataset["user_id"]):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Load the model
        job.update(current_step=3)
        model = SentClassificationLightningModel.load_from_checkpoint(classifier.path)
        # The evaluation setting overrides the stored training setting.
        model.averaging = (
            parameters.averaging.value
            if parameters.averaging is not None
            else classifier.train_params["averaging"]
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
        # When the eval data contains no entity tokens, no metrics are logged
        # (the metric hook returns early), so the keys are missing.
        if "test_f1" not in eval_results:
            raise EmptyEvaluationError()

        # 5. Store the evaluation in the DB
        job.update(current_step=5)
        labelid2codeid = {v: k for k, v in codeid2labelid.items()}
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
                        class_id=labelid2codeid[m["label_id"]],
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
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
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
        labelid2codeid = {
            int(label): c for label, c in classifier.labelid2classid.items()
        }

        # Delete existing annotations (if requested by the user)
        if parameters.delete_existing_work:
            crud_sentence_anno.remove_by_user_sdocs_codes(
                db=db,
                user_id=ASSISTANT_TRAINED_ID,
                sdoc_ids=parameters.sdoc_ids,
                code_ids=classifier.class_ids,
            )

        # 2. Create dataset
        job.update(current_step=2)
        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=parameters.sdoc_ids)
        usable_sdoc_datas = [
            sdoc_data for sdoc_data in sdoc_datas if sdoc_data.sentences
        ]
        excluded_sdoc_count = len(parameters.sdoc_ids) - len(usable_sdoc_datas)
        if excluded_sdoc_count > 0:
            logger.warning(
                f"Excluding {excluded_sdoc_count} source documents with missing or "
                "empty sentence data from sentence-classifier inference."
            )

        # Build one inference row per requested source document.
        inference_dataset: list[DatasetRow] = []
        for sdoc_data in usable_sdoc_datas:
            inference_dataset.append(
                {
                    "sdoc_id": sdoc_data.id,
                    "sentences": sdoc_data.sentences,
                    "labels": [O_LABEL_ID] * len(sdoc_data.sentences),  # Dummy labels
                    "user_id": ASSISTANT_TRAINED_ID,  # Dummy user_id
                }
            )
        if not inference_dataset:
            raise EmptyDatasetError()
        hf_dataset = Dataset.from_list(inference_dataset)  # type: ignore

        # Build dataloader
        inference_dataloader = DataLoader(
            hf_dataset,  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=classifier.train_params["batch_size"],
        )

        # 3. Load the model
        job.update(current_step=3)
        model = SentClassificationLightningModel.load_from_checkpoint(
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
        # Flatten outputs
        flat_predictions: list[list[int]] = []
        flat_sdoc_ids: list[int] = []
        for pred in predictions:
            flat_sdoc_ids.extend([x.item() for x in pred["sdoc_ids"]])  # type: ignore
            flat_predictions.extend(pred["predictions"])  # type: ignore

        # Parse predictions to sent annotations.
        # sentence_id_end is INCLUSIVE (matches SentenceAnnotation semantics).
        results: list[AnnotationResult] = []
        for sdoc_id, predictions in zip(flat_sdoc_ids, flat_predictions):
            # Reset per-document state so annotations never leak across docs.
            prev_label = O_LABEL_ID
            current_annotation: AnnotationResult | None = None

            for sent_id, label in enumerate(predictions):
                if label != prev_label:
                    # The current annotation ends. sent_id is the first sentence
                    # after the span, so the inclusive end is sent_id - 1.
                    if current_annotation is not None:
                        current_annotation["end"] = sent_id - 1
                        results.append(current_annotation)
                        current_annotation = None

                    # A new annotation starts
                    if label != O_LABEL_ID:
                        current_annotation = {
                            "sdoc_id": sdoc_id,
                            "begin": sent_id,
                            "class_id": labelid2codeid[label],
                            "end": -1,
                        }

                prev_label = label

            # Finish the current annotation. The inclusive end is the last
            # sentence index.
            if current_annotation is not None:
                current_annotation["end"] = len(predictions) - 1
                results.append(current_annotation)

        # 6. Store annotations in DB
        job.update(current_step=6)
        # Convert to DTOs (and compute statistics)
        create_dtos: list[SentenceAnnotationCreate] = []
        result_statistics: dict[int, int] = defaultdict(
            int
        )  # map from code_id to number of annotations
        affected_sdoc_ids: set[int] = set()
        for annotation in results:
            create_dtos.append(
                SentenceAnnotationCreate(
                    sentence_id_start=annotation["begin"],
                    sentence_id_end=annotation["end"],
                    code_id=annotation["class_id"],
                    sdoc_id=annotation["sdoc_id"],
                )
            )
            result_statistics[annotation["class_id"]] += 1
            affected_sdoc_ids.add(annotation["sdoc_id"])

        # Write to db
        crud_sentence_anno.create_bulk(
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
