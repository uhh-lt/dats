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
from sqlalchemy.orm import Session
from torch.utils.data import DataLoader
from transformers import (
    AutoConfig,
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
)

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
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

        # Load the evaluation metric
        self.seqeval = evaluate.load("seqeval")

        # Define custom loss function
        self.loss_fn = nn.CrossEntropyLoss(weight=torch.tensor(class_weights))

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

        # Post-process for seqeval
        labels = batch["labels"].tolist()
        true_predictions = [
            [
                f"I-{p1}" if p1 != 0 else "O"
                for (p1, l1) in zip(prediction, label)
                if l1 != -100
            ]
            for prediction, label in zip(predictions, labels)
        ]
        true_labels = [
            [
                f"I-{l2}" if l2 != 0 else "O"
                for (p2, l2) in zip(prediction, label)
                if l2 != -100
            ]
            for prediction, label in zip(predictions, labels)
        ]

        results = self.seqeval.compute(
            predictions=true_predictions, references=true_labels, scheme="IOB1"
        )
        assert results is not None, "SeqEval results are None"

        # Log metrics
        self.log(f"{prefix}_loss", outputs.loss.detach(), on_step=False, on_epoch=True)
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
        return outputs.loss.detach()

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
            "sdoc_ids": batch["sdoc_id"],
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

        # Get annotations
        results = (
            db.query(
                SpanAnnotationORM,
                AnnotationDocumentORM,
            )
            .join(SpanAnnotationORM.annotation_document)
            .filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                SpanAnnotationORM.code_id.in_(class_ids),
            )
            .all()
        )

        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)
        sdocid2data = {sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas}

        # Group annotations by user and source document
        user_id2sdoc_id2annotations: dict[int, dict[int, list[SpanAnnotationORM]]] = (
            defaultdict(lambda: defaultdict(list))
        )
        for row in results:
            annotation, adoc = row._tuple()
            user_id2sdoc_id2annotations[adoc.user_id][adoc.source_document_id].append(
                annotation
            )

        # Create a labeled dataset
        # Every annotated source document is part of the training data
        # If the same document was annotated by two different users it will be included twice
        dataset: list[DatasetRow] = []
        for user_id, sdoc_id2annotations in user_id2sdoc_id2annotations.items():
            sdoc_id2annotations = user_id2sdoc_id2annotations[user_id]
            for sdoc_id, annotations in sdoc_id2annotations.items():
                sdoc_data = sdocid2data[sdoc_id]
                words = sdoc_data.tokens
                labels = [0 for word in words]
                for annotation in annotations:
                    labels[annotation.begin_token : annotation.end_token] = [
                        classid2labelid.get(annotation.code_id, 0)
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
                for word_idx in word_ids:  # Set the special tokens to -100.
                    if word_idx is None:
                        label_ids.append(-100)
                    elif (
                        word_idx != previous_word_idx
                    ):  # Only label the first token of a given word.
                        label_ids.append(label[word_idx])
                    else:
                        label_ids.append(-100)
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
        codes = crud_code.read_by_ids(db=db, ids=parameters.class_ids)
        classid2labelid: dict[int, int] = {
            code.id: i + 1 for i, code in enumerate(codes)
        }
        classid2labelid[0] = 0
        id2label = {i + 1: code.name for i, code in enumerate(codes)}
        id2label[0] = "O"

        # Build dataset
        user_id2sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            user_ids=parameters.user_ids,
            class_ids=parameters.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
            use_chunking=True,
        )

        # Train test split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)

        def split_in_chunks(examples: dict):
            chunk_len = tokenizer.model_max_length - 2
            for key, values in examples.items():
                if "labels" == key:
                    pre = [-100]
                    post = [-100]
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
            # Special params
            # gradient_clip_val=1.0,  # Gradient clipping
        )

        with trainer.init_module():
            # Initialize the Lightning Model
            lightning_model = SpanClassificationLightningModel(
                base_name=parameters.base_name,
                num_labels=len(classid2labelid),
                dropout=parameters.dropout,
                learning_rate=parameters.learning_rate,
                weight_decay=parameters.weight_decay,
                class_weights=class_weights,
                id2label=id2label,
                label2id={v: k for k, v in id2label.items()},
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
        best_model = SpanClassificationLightningModel.load_from_checkpoint(
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

        # Build dataloader
        test_dataloader = DataLoader(
            dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
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
        model = SpanClassificationLightningModel.load_from_checkpoint(classifier.path)

        # 4. Eval model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "eval_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(
            logger=csv_logger,
        )
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

        # Construct a tokenized huggingface dataset
        sdoc_id2word_ids: dict[int, list[int | None]] = {}

        def tokenize_for_inference(examples):
            tokenized_inputs = tokenizer(
                examples["words"], truncation=True, is_split_into_words=True
            )

            for i, sdoc_id in enumerate(examples["sdoc_id"]):
                word_ids = tokenized_inputs.word_ids(batch_index=i)
                sdoc_id2word_ids[sdoc_id] = word_ids

            return tokenized_inputs

        hf_dataset = Dataset.from_list(inference_dataset)  # type: ignore
        tokenized_hf_dataset = hf_dataset.map(tokenize_for_inference, batched=True)
        tokenized_hf_dataset = tokenized_hf_dataset.remove_columns(["words"])

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

        # 4. Predict with model
        job.update(current_step=4)
        log_dir = Path(classifier.path).parent / "infer_logs"
        csv_logger = CSVLogger(log_dir, name=classifier.name)
        trainer = pl.Trainer(
            logger=csv_logger,
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

        # Map labels to words
        # word_ids: [None, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6 None]
        # labels:      [0, 0, 5, 5, 5, 5, 0, 0, 7, 7, 7, 0]
        prev_label = 0
        results: list[AnnotationResult] = []
        current_annotation: AnnotationResult | None = None
        for sdoc_id, labels in zip(flat_sdoc_ids, flat_predictions):
            word_ids = sdoc_id2word_ids[sdoc_id]

            for word_id, label in zip(word_ids, labels):
                # Skip special tokens
                if word_id is None:
                    continue

                if label != prev_label:
                    # The current annotation ends
                    if current_annotation is not None:
                        current_annotation["end_token"] = word_id
                        results.append(current_annotation)
                        current_annotation = None

                    # A new annotation starts
                    if label != 0:
                        current_annotation = {
                            "sdoc_id": sdoc_id,
                            "begin_token": word_id,
                            "class_id": labelid2classid[label],
                            "end_token": -1,
                        }

                prev_label = label

            # Finish the current annotation
            if current_annotation is not None and word_ids[-1] is not None:
                current_annotation["end_token"] = word_ids[-1]
                results.append(current_annotation)
                current_annotation = None

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
            end_char = sdoc_data.token_ends[annotation["end_token"]]
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
