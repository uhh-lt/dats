from collections import defaultdict
from pathlib import Path
from typing import Any, TypedDict
from uuid import uuid4

import evaluate
import pandas as pd
import pytorch_lightning as pl
import torch
import torch.nn as nn
from datasets import Dataset
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint
from pytorch_lightning.loggers import CSVLogger
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence, pad_sequence
from torch.utils.data import DataLoader
from torchcrf import CRF

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
    ClassifierCreate,
    ClassifierData,
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
    ClassifierTask,
    ClassifierTrainingOutput,
    ClassifierTrainingParams,
)
from modules.classifier.classifier_exceptions import BaseModelDoesNotExistError
from modules.classifier.models.job_progress_callback import JobProgressCallback
from modules.classifier.models.model_utils import check_hf_model_exists
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job


class DatasetRow(TypedDict):
    user_id: int
    labels: list[int]
    sdoc_id: int
    sentences: torch.Tensor


class AnnotationResult(TypedDict):
    begin: int
    end: int
    class_id: int
    sdoc_id: int


class SentClassificationLightningModel(pl.LightningModule):
    def __init__(
        self,
        num_labels: int,
        dropout: float,
        learning_rate: float,
        weight_decay: float,
        class_weights: torch.Tensor,
        # special params
        embedding_model_name: str,
        embedding_dim: int,
        hidden_dim: int,
        use_lstm: bool,
        id2label: dict[int, str] | None = None,
        label2id: dict[str, int] | None = None,
    ):
        super().__init__()
        # Saves hyperparameters to the checkpoint
        self.save_hyperparameters()

        # Init model architecure
        self.embedding_dim = embedding_dim

        if use_lstm:
            self.lstm = nn.LSTM(
                self.embedding_dim,
                hidden_dim,
                batch_first=True,
                bidirectional=True,
                dropout=dropout,
            )
            linear_input_dim = 2 * hidden_dim  # Double the hidden_dim for bidirectional
        else:
            linear_input_dim = self.embedding_dim
            self.lstm = None

        self.linear = nn.Linear(linear_input_dim, num_labels)
        self.crf = CRF(num_labels, batch_first=True)

        # Store params
        self.num_labels = num_labels
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.class_weights = class_weights
        self.embedding_model_name = embedding_model_name
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.use_lstm = use_lstm
        self.id2label = id2label
        self.label2id = label2id

        # Load the evaluation metric
        self.seqeval = evaluate.load("seqeval")

    def forward(
        self,
        sentences: torch.Tensor,
        mask=None,
        labels=None,
        **kwargs,
    ):
        assert mask is not None, "Mask must be provided"

        if self.lstm:
            lengths = mask.sum(dim=1).tolist()  # Calculate lengths of valid sequences
            packed_embeddings = pack_padded_sequence(
                sentences, lengths, batch_first=True, enforce_sorted=False
            )
            packed_output, _ = self.lstm(
                packed_embeddings
            )  # Pass packed sequence to LSTM
            sentences, _ = pad_packed_sequence(
                packed_output, batch_first=True
            )  # Unpack the output

        emissions = self.linear(sentences)

        # inference
        if labels is None:
            return self.crf.decode(emissions, mask=mask)
        # training
        else:
            return -self.crf(
                emissions, labels, mask=mask
            )  # Negative log-likelihood loss

    def training_step(self, batch, batch_idx):
        loss = self(**batch)

        self.log("train_loss", loss, on_step=False, on_epoch=True)
        return loss

    def _val_test_step(self, prefix: str, batch, batch_idx: int) -> torch.Tensor:
        loss = self(**batch)

        # Get predictions and ground truth tags
        sentences = batch["sentences"]
        mask = batch["mask"]
        labels = batch["labels"]
        predictions = self(sentences=sentences, mask=mask)
        golds = []
        for i in range(len(labels)):  # Iterate over the batch
            golds.append(labels[i][mask[i] == 1].tolist())

        # Post-process for seqeval
        true_predictions = [
            [f"I-{p}" if p != 0 else "O" for p in prediction]
            for prediction in predictions
        ]
        true_labels = [[f"I-{g}" if g != 0 else "O" for g in gold] for gold in golds]

        results = self.seqeval.compute(
            predictions=true_predictions, references=true_labels, scheme="IOB1"
        )
        assert results is not None, "SeqEval results are None"

        # Log metrics
        self.log(f"{prefix}_loss", loss, on_step=False, on_epoch=True)
        self.log_dict(
            {
                f"{prefix}_precision": results["overall_precision"],
                f"{prefix}_recall": results["overall_recall"],
                f"{prefix}_f1": results["overall_f1"],
                f"{prefix}_accuracy": results["overall_accuracy"],
            },
            on_step=False,
            on_epoch=True,
            prog_bar=True,
        )
        return loss

    def validation_step(self, batch, batch_idx):
        return self._val_test_step(
            prefix="eval",
            batch=batch,
            batch_idx=batch_idx,
        )

    def test_step(self, batch, batch_idx):
        return self._val_test_step(
            prefix="test",
            batch=batch,
            batch_idx=batch_idx,
        )

    def predict_step(self, batch: dict[str, Any], batch_idx: int) -> Any:
        # Get predictions and ground truth tags
        predictions = self(sentences=batch["sentences"], mask=batch["mask"])

        return {
            "sdoc_ids": batch["sdoc_id"],
            "predictions": predictions,
        }

    def configure_optimizers(self) -> torch.optim.Optimizer:
        optimizer = torch.optim.AdamW(
            self.parameters(), lr=self.learning_rate, weight_decay=self.weight_decay
        )
        return optimizer


class SentClassificationModelService(TextClassificationModelService):
    def _retrieve_build_embedd_dataset(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        classid2labelid: dict[int, int],
        embedding_model: SentenceTransformer,
    ) -> tuple[dict[int, dict[int, list[SentenceAnnotationORM]]], Dataset]:
        # Find documents
        sdoc_ids = [
            sdoc.id
            for sdoc in crud_sdoc.read_all_with_tags(
                db=db,
                project_id=project_id,
                tag_ids=tag_ids,
            )
        ]

        # Get annotations
        results = (
            db.query(
                SentenceAnnotationORM,
                AnnotationDocumentORM,
            )
            .join(SentenceAnnotationORM.annotation_document)
            .filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                SentenceAnnotationORM.code_id.in_(class_ids),
            )
            .all()
        )

        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)
        sdocid2data = {sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas}

        # Group annotations by user and source document
        user_id2sdoc_id2annotations: dict[
            int, dict[int, list[SentenceAnnotationORM]]
        ] = defaultdict(lambda: defaultdict(list))
        for row in results:
            annotation, adoc = row._tuple()
            user_id2sdoc_id2annotations[adoc.user_id][adoc.source_document_id].append(
                annotation
            )

        # Create a labeled, embedded dataset
        # Every annotated source document is part of the training data
        # If the same document was annotated by two different users it will be included twice
        dataset: list[DatasetRow] = []
        for user_id, sdoc_id2annotations in user_id2sdoc_id2annotations.items():
            sdoc_id2annotations = user_id2sdoc_id2annotations[user_id]
            for sdoc_id, annotations in sdoc_id2annotations.items():
                sdoc_data = sdocid2data[sdoc_id]
                sentences = sdoc_data.sentences
                labels = [0 for sentence in sentences]
                for annotation in annotations:
                    labels[
                        annotation.sentence_id_start : annotation.sentence_id_end
                    ] = [classid2labelid.get(annotation.code_id, 0)] * (
                        annotation.sentence_id_end - annotation.sentence_id_start
                    )

                embedded_sentences = embedding_model.encode(
                    sentences, convert_to_tensor=True
                )
                dataset.append(
                    {
                        "sdoc_id": sdoc_data.id,
                        "user_id": user_id,
                        "sentences": embedded_sentences,
                        "labels": labels,
                    }
                )

        # Construct an embedded huggingface dataset
        hf_dataset = Dataset.from_list(dataset)  # type: ignore

        return user_id2sdoc_id2annotations, hf_dataset

    def _collate_fn(self, batch):
        embeddings = [torch.tensor(b["sentences"]) for b in batch]
        labels = [torch.tensor(b["labels"]) for b in batch]
        sdoc_ids = [b["sdoc_id"] for b in batch]
        user_ids = [b["user_id"] for b in batch]

        # Pad labels
        padded_labels = pad_sequence(labels, batch_first=True, padding_value=0)

        # Create mask
        mask = torch.zeros(padded_labels.shape, dtype=torch.bool)
        for i, label in enumerate(labels):
            mask[i, : len(label)] = 1

        # Pad embeddings
        padded_embeddings = pad_sequence(embeddings, batch_first=True, padding_value=0)  # type: ignore

        # switch first sentence (0) with longest sentence (longest_idx)
        longest_idx = max(range(len(labels)), key=lambda k: len(labels[k]))

        padded_embeddings = padded_embeddings.tolist()
        padded_labels = padded_labels.tolist()
        mask = mask.tolist()

        new_padded_embeddings = padded_embeddings.copy()
        new_padded_labels = padded_labels.copy()
        new_mask = mask.copy()
        new_sdoc_ids = sdoc_ids.copy()
        new_user_ids = user_ids.copy()

        new_padded_embeddings[0] = padded_embeddings[longest_idx]
        new_padded_labels[0] = padded_labels[longest_idx]
        new_mask[0] = mask[longest_idx]
        new_sdoc_ids[0] = sdoc_ids[longest_idx]
        new_user_ids[0] = user_ids[longest_idx]

        new_padded_embeddings[longest_idx] = padded_embeddings[0]
        new_padded_labels[longest_idx] = padded_labels[0]
        new_mask[longest_idx] = mask[0]
        new_sdoc_ids[longest_idx] = sdoc_ids[0]
        new_user_ids[longest_idx] = user_ids[0]

        assert (
            len(padded_embeddings)
            == len(padded_labels)
            == len(mask)
            == len(new_padded_embeddings)
            == len(new_padded_labels)
            == len(new_mask)
        ), (
            f"Lengths must match: {len(padded_embeddings)}, {len(padded_labels)}, {len(mask)}, {len(new_padded_embeddings)}, {len(new_padded_labels)}, {len(new_mask)}"
        )

        return {
            "sentences": torch.tensor(new_padded_embeddings),
            "labels": torch.tensor(new_padded_labels),
            "mask": torch.tensor(new_mask, dtype=torch.bool),
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
        # Get codes and create mapping
        codes = crud_code.read_by_ids(db=db, ids=parameters.class_ids)
        classid2labelid: dict[int, int] = {
            code.id: i + 1 for i, code in enumerate(codes)
        }
        classid2labelid[0] = 0
        id2label = {i + 1: code.name for i, code in enumerate(codes)}
        id2label[0] = "O"

        # Build dataset
        embedding_model = SentenceTransformer(parameters.base_name)
        embedding_dim = embedding_model.get_sentence_embedding_dimension()
        if embedding_dim is None:
            raise ValueError(
                f"Could not determine embedding dimension of model '{parameters.base_name}'"
            )
        user_id2sdoc_id2annotations, dataset = self._retrieve_build_embedd_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            class_ids=parameters.class_ids,
            classid2labelid=classid2labelid,
            embedding_model=embedding_model,
        )

        # Free the embedding model memory
        del embedding_model
        torch.cuda.empty_cache()

        # Train test split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)
        train_dataloader = DataLoader(
            split_dataset["train"],  # type: ignore
            shuffle=True,
            collate_fn=self._collate_fn,
            batch_size=parameters.batch_size,
        )
        val_dataloader = DataLoader(
            split_dataset["test"],  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=parameters.batch_size,
        )

        # Dataset statistics (number of annotations per code)
        train_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for sdoc_id, user_id in zip(
            split_dataset["train"]["sdoc_id"], split_dataset["train"]["user_id"]
        ):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                train_dataset_stats[annotation.code_id] += 1

        eval_dataset_stats: dict[int, int] = {code.id: 0 for code in codes}
        for sdoc_id, user_id in zip(
            split_dataset["test"]["sdoc_id"], split_dataset["test"]["user_id"]
        ):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # Calculate class weights
        # Count the occurrences of each label in the training set
        label_counts = defaultdict(int)
        for labels in split_dataset["train"]["labels"]:
            for label in labels:
                if label != -100:  # Ignore padding tokens
                    label_counts[label] += 1

        # Calculate the weight for each label: A simple inverse frequency weighting
        total_tokens = sum(label_counts.values())
        num_labels = len(classid2labelid)
        class_weights = [0.0] * num_labels
        for label, count in label_counts.items():
            if count > 0:
                class_weights[label] = total_tokens / (num_labels * count)
            else:
                raise ValueError(f"Label '{label}' has zero count in training data!")

        # 2. Initialize PyTorch Lightning components
        job.update(current_step=2)
        # Initialize the Lightning Model
        lightning_model = SentClassificationLightningModel(
            # embedding model params
            embedding_model_name=parameters.base_name,
            embedding_dim=embedding_dim,
            # sent classifier specific params
            hidden_dim=int(embedding_dim / 2),
            use_lstm=True,
            # training params
            num_labels=len(classid2labelid),
            dropout=parameters.dropout,
            learning_rate=parameters.learning_rate,
            weight_decay=parameters.weight_decay,
            class_weights=torch.tensor(class_weights, dtype=torch.float32),
            id2label=id2label,
            label2id={v: k for k, v in id2label.items()},
        )

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
            # Special params
            # precision=32,  # full precision training
            # gradient_clip_val=1.0,  # Gradient clipping
        )

        # 3. Train the model
        job.update(current_step=3)
        trainer.fit(
            lightning_model,
            train_dataloaders=train_dataloader,
            val_dataloaders=val_dataloader,
        )

        # 4. Evaluate the best model
        job.update(current_step=4)
        best_model = SentClassificationLightningModel.load_from_checkpoint(
            checkpoint_callback.best_model_path
        )
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
                labelid2classid={v: k for k, v in classid2labelid.items()},
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
        classid2labelid = {v: int(k) for k, v in classifier.labelid2classid.items()}

        # 2. Create dataset
        job.update(current_step=2)

        # Build dataset
        embedding_model = SentenceTransformer(classifier.base_model)
        user_id2sdoc_id2annotations, dataset = self._retrieve_build_embedd_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            class_ids=classifier.class_ids,
            classid2labelid=classid2labelid,
            embedding_model=embedding_model,
        )

        # Free the embedding model memory
        del embedding_model
        torch.cuda.empty_cache()

        # Build dataloader
        test_dataloader = DataLoader(
            dataset,  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # Dataset statistics (number of annotations per code)
        eval_dataset_stats: dict[int, int] = {
            code_id: 0 for code_id, label_id in classid2labelid.items() if label_id != 0
        }
        for sdoc_id, user_id in zip(dataset["sdoc_id"], dataset["user_id"]):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Load the model
        job.update(current_step=3)
        model = SentClassificationLightningModel.load_from_checkpoint(classifier.path)

        # 4. Eval model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "eval_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(logger=csv_logger)
        eval_results = trainer.test(model, dataloaders=test_dataloader)[0]

        # 5. Store the evaluation in the DB
        job.update(current_step=5)
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
        labelid2classid = {
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

        # Constructing dataset
        embedding_model = SentenceTransformer(classifier.base_model)
        inference_dataset: list[DatasetRow] = []
        for sdoc_data in sdoc_datas:
            sentences = embedding_model.encode(
                sdoc_data.sentences, convert_to_tensor=True
            )
            inference_dataset.append(
                {
                    "sdoc_id": sdoc_data.id,
                    "sentences": sentences,
                    "labels": [0] * len(sdoc_data.sentences),  # Dummy labels
                    "user_id": ASSISTANT_TRAINED_ID,  # Dummy user_id
                }
            )
        hf_dataset = Dataset.from_list(inference_dataset)  # type: ignore

        # Free the embedding model memory
        del embedding_model
        torch.cuda.empty_cache()

        # Build dataloader
        inference_dataloader = DataLoader(
            hf_dataset,  # type: ignore
            shuffle=False,
            collate_fn=self._collate_fn,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # 3. Load the model
        job.update(current_step=3)
        model = SentClassificationLightningModel.load_from_checkpoint(
            classifier.path,
        )

        # 4. Predict with model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "infer_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(logger=csv_logger)
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

        # Parse predictions to sent annotations
        prev_label = 0
        results: list[AnnotationResult] = []
        current_annotation: AnnotationResult | None = None
        for sdoc_id, predictions in zip(flat_sdoc_ids, flat_predictions):
            for sent_id, label in enumerate(predictions):
                if label != prev_label:
                    # The current annotation ends
                    if current_annotation is not None:
                        current_annotation["end"] = sent_id
                        results.append(current_annotation)
                        current_annotation = None

                    # A new annotation starts
                    if label != 0:
                        current_annotation = {
                            "sdoc_id": sdoc_id,
                            "begin": sent_id,
                            "class_id": labelid2classid[label],
                            "end": -1,
                        }

                prev_label = label

            # Finish the current annotation
            if current_annotation is not None:
                current_annotation["end"] = len(predictions) - 1
                results.append(current_annotation)
                current_annotation = None

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
