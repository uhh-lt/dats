from collections import defaultdict
from pathlib import Path
from typing import Any, TypedDict
from uuid import uuid4

import evaluate
import pandas as pd
import pytorch_lightning as pl
import torch
from datasets import Dataset
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint
from pytorch_lightning.loggers import CSVLogger
from sqlalchemy.orm import Session
from torch.utils.data import DataLoader
from transformers import (
    AutoConfig,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
)

from core.annotation.span_annotation_crud import crud_span_anno
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
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
from modules.classifier.models.model_utils import check_hf_model_exists
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job


class InferenceDatasetRow(TypedDict):
    sdoc_id: int
    text: str


class DatasetRow(InferenceDatasetRow):
    label: int


class AnnotationResult(TypedDict):
    class_id: int
    sdoc_id: int


class DocClassificationLightningModel(pl.LightningModule):
    def __init__(
        self,
        base_name: str,
        num_labels: int,
        dropout: float,
        learning_rate: float,
        weight_decay: float,
        class_weights: torch.Tensor,
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
        self.model = AutoModelForSequenceClassification.from_pretrained(
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
        self.accuracy = evaluate.load("accuracy")
        self.precision = evaluate.load("precision")
        self.recall = evaluate.load("recall")
        self.f1 = evaluate.load("f1")

        # Define custom loss function
        # self.loss_fn = nn.CrossEntropyLoss(weight=class_weights)

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
        # the standard loss computed by HF model
        loss = outputs.loss

        # our weighted Cross Entropy Loss
        # logits = outputs.logits
        # labels = batch["labels"]
        # loss = self.loss_fn(logits.view(-1, self.num_labels), labels.view(-1))

        self.log("train_loss", loss, on_step=False, on_epoch=True)
        return loss

    def _val_test_step(
        self, prefix: str, batch: dict[str, Any], batch_idx: int
    ) -> torch.Tensor:
        # Predict
        outputs = self(**batch)
        predictions = torch.argmax(outputs.logits, dim=1).tolist()

        # Compute metrics
        golds = batch["label"]
        a = self.accuracy.compute(predictions=predictions, references=golds)
        p = self.precision.compute(
            predictions=predictions, references=golds, average="macro"
        )
        r = self.recall.compute(
            predictions=predictions, references=golds, average="macro"
        )
        f = self.f1.compute(predictions=predictions, references=golds, average="macro")
        assert p is not None and r is not None and f is not None and a is not None

        # Log metrics
        self.log(f"{prefix}_loss", outputs.loss, on_step=False, on_epoch=True)
        self.log_dict(
            {
                f"{prefix}_precision": p["precision"],
                f"{prefix}_recall": r["recall"],
                f"{prefix}_f1": f["f1"],
                f"{prefix}_accuracy": a["accuracy"],
            },
            on_step=False,
            on_epoch=True,
            prog_bar=True,
        )
        return outputs.loss

    def validation_step(self, batch: dict[str, Any], batch_idx: int) -> torch.Tensor:
        return self._val_test_step(
            prefix="eval",
            batch=batch,
            batch_idx=batch_idx,
        )

    def test_step(self, batch: dict[str, Any], batch_idx: int) -> torch.Tensor:
        return self._val_test_step(
            prefix="test",
            batch=batch,
            batch_idx=batch_idx,
        )

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
            self.parameters(), lr=self.learning_rate, weight_decay=self.weight_decay
        )
        return optimizer


class DocClassificationModelService(TextClassificationModelService):
    def _retrieve_and_build_dataset(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        class_ids: list[int],
        classid2labelid: dict[int, int],
        tokenizer,
    ) -> tuple[dict[int, list[TagORM]], Dataset]:
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
                SourceDocumentORM,
                TagORM,
            )
            .join(SourceDocumentORM.tags)
            .filter(
                TagORM.id.in_(class_ids),
                SourceDocumentORM.id.in_(sdoc_ids),
            )
            .all()
        )

        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)
        sdocid2data = {sdoc_data.id: sdoc_data for sdoc_data in sdoc_datas}

        # Group classifications by source document
        sdoc_id2annotations: dict[int, list[TagORM]] = {
            sdoc_id: [] for sdoc_id in sdoc_ids
        }
        for row in results:
            doc, tag = row._tuple()
            sdoc_id2annotations[doc.id].append(tag)

        # Create a labeled dataset
        # Every source document is part of the training data
        dataset: list[DatasetRow] = []
        for sdoc_id, annotations in sdoc_id2annotations.items():
            sdoc_data = sdocid2data[sdoc_id]
            dataset.append(
                {
                    "sdoc_id": sdoc_data.id,
                    "text": sdoc_data.content,
                    "label": annotations[0].id if len(annotations) > 0 else 0,
                }
            )

        # Construct a tokenized huggingface dataset
        def tokenize_text(examples):
            return tokenizer(examples["text"], truncation=True)

        hf_dataset = Dataset.from_list(dataset)  # type: ignore
        tokenized_hf_dataset = hf_dataset.map(tokenize_text, batched=True)
        tokenized_hf_dataset = tokenized_hf_dataset.remove_columns(["text"])

        return sdoc_id2annotations, tokenized_hf_dataset

    def train(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # 0. Check inputs
        # Does the provided model exist
        if not check_hf_model_exists(parameters.base_name):
            raise BaseModelDoesNotExistError(parameters.base_name)

        tokenizer = AutoTokenizer.from_pretrained(parameters.base_name)
        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

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
        # Get tags and create mapping
        tags = crud_tag.read_by_ids(db=db, ids=parameters.class_ids)
        classid2labelid: dict[int, int] = {tag.id: i + 1 for i, tag in enumerate(tags)}
        classid2labelid[0] = 0
        id2label = {i + 1: tag.name for i, tag in enumerate(tags)}
        id2label[0] = "O"

        # Build dataset
        sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            class_ids=parameters.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
        )

        # Train test split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)
        train_dataloader = DataLoader(
            split_dataset["train"],  # type: ignore
            shuffle=True,
            collate_fn=data_collator,
            batch_size=parameters.batch_size,
        )
        val_dataloader = DataLoader(
            split_dataset["test"],  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=parameters.batch_size,
        )

        # Dataset statistics (number of annotations per code)
        train_dataset_stats: dict[int, int] = {tag.id: 0 for tag in tags}
        for sdoc_id in split_dataset["train"]["sdoc_id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                train_dataset_stats[annotation.id] += 1

        eval_dataset_stats: dict[int, int] = {tag.id: 0 for tag in tags}
        for sdoc_id in split_dataset["test"]["sdoc_id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                eval_dataset_stats[annotation.id] += 1

        # Calculate class weights
        # Count the occurrences of each label in the training set
        label_counts = defaultdict(int)
        for label in split_dataset["train"]["label"]:
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
        lightning_model = DocClassificationLightningModel(
            base_name=parameters.base_name,
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
            model_prefix="doc_classifier_",
        )

        log_dir = model_dir / "logs"
        csv_logger = CSVLogger(log_dir, name=f"doc_classifier_{model_name}")

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
        best_model = DocClassificationLightningModel.load_from_checkpoint(
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
            codes=[],
            tags=tags,
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
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
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
        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

        # 2. Create dataset
        job.update(current_step=2)

        # Build dataset
        sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            project_id=payload.project_id,
            tag_ids=parameters.tag_ids,
            class_ids=classifier.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
        )

        # Build dataloader
        test_dataloader = DataLoader(
            dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # Dataset statistics (number of annotations per tag)
        eval_dataset_stats: dict[int, int] = {
            tag_id: 0 for tag_id, label_id in classid2labelid.items() if label_id != 0
        }
        for sdoc_id in dataset["sdoc_id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                eval_dataset_stats[annotation.id] += 1

        # 3. Load the model
        job.update(current_step=3)
        model = DocClassificationLightningModel.load_from_checkpoint(classifier.path)

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
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
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

        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

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
        inference_dataset: list[InferenceDatasetRow] = [
            {"sdoc_id": sdoc_data.id, "text": sdoc_data.content}
            for sdoc_data in sdoc_datas
        ]

        # Construct a tokenized dataset
        def tokenize_text(examples):
            return tokenizer(examples["text"], truncation=True)

        hf_dataset = Dataset.from_list(inference_dataset)  # type: ignore
        tokenized_hf_dataset = hf_dataset.map(tokenize_text, batched=True)
        tokenized_hf_dataset = tokenized_hf_dataset.remove_columns(["text"])

        # Build dataloader
        inference_dataloader = DataLoader(
            tokenized_hf_dataset,  # type: ignore
            shuffle=False,
            collate_fn=data_collator,
            batch_size=classifier.train_params.get("batch_size", 4),
        )

        # 3. Load the model
        job.update(current_step=3)
        model = DocClassificationLightningModel.load_from_checkpoint(
            classifier.path,
        )

        # 4. Predict with model
        job.update(current_step=4)
        trainer = pl.Trainer()
        predictions = trainer.predict(model, dataloaders=inference_dataloader)
        assert predictions is not None, "No predictions returned!"

        # 5. Post-process the predictions to extract annotations
        job.update(current_step=5)
        # Flatten outputs
        flat_predictions: list[int] = []
        flat_sdoc_ids: list[int] = []
        for pred in predictions:
            flat_sdoc_ids.extend([x.item() for x in pred["sdoc_ids"]])  # type: ignore
            flat_predictions.extend(pred["predictions"])  # type: ignore

        # Map predictions
        results: list[AnnotationResult] = []
        for sdoc_id, label in zip(flat_sdoc_ids, flat_predictions):
            if label != 0:  # 0 is the "O" label, i.e. no classification
                results.append(
                    {
                        "sdoc_id": sdoc_id,
                        "class_id": labelid2classid[label],
                    }
                )

        # 6. Store annotations in DB
        job.update(current_step=6)

        # current state
        sdoc_ids2tags = crud_tag.read_tags_for_documents(
            db=db, sdoc_ids=list({x["sdoc_id"] for x in results})
        )
        sdoc_ids2tag_ids = {
            sdoc_id: {tag.id for tag in tags} for sdoc_id, tags in sdoc_ids2tags.items()
        }

        # update current state with results
        result_statistics: dict[int, int] = defaultdict(
            int
        )  # map from tag_id to number of annotations
        for result in results:
            sdoc_ids2tag_ids[result["sdoc_id"]].add(result["class_id"])
            result_statistics[result["class_id"]] += 1

        # write updated state to db
        sdoc_ids2tag_ids_list = {
            sdoc_id: list(tag_ids) for sdoc_id, tag_ids in sdoc_ids2tag_ids.items()
        }
        crud_tag.set_tags_batch(db=db, links=sdoc_ids2tag_ids_list)

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
                result_statistics=[
                    ClassifierData(class_id=class_id, num_examples=count)
                    for class_id, count in result_statistics.items()
                ],
                total_affected_docs=len(sdoc_ids2tag_ids_list),
            ),
        )
