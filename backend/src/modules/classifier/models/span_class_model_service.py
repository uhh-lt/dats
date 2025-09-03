from collections import defaultdict
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
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
)

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
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


class DatasetRow(TypedDict):
    sdoc_id: int
    user_id: int
    words: list[str]
    labels: list[int]


class SpanClassificationLightningModel(pl.LightningModule):
    def __init__(
        self,
        base_name: str,
        num_labels: int,
        learning_rate: float,
        weight_decay: float,
        class_weights: torch.Tensor,
    ):
        super().__init__()
        # Saves hyperparameters to the checkpoint
        self.save_hyperparameters()

        # Load the pre-trained model
        self.model = AutoModelForTokenClassification.from_pretrained(
            base_name,
            num_labels=num_labels,
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

        self.num_labels = num_labels
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay

        # Load the evaluation metric
        self.seqeval = evaluate.load("seqeval")

        # Define custom loss function
        self.loss_fn = nn.CrossEntropyLoss(weight=class_weights)

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

        self.log("train_loss", loss, on_step=False, on_epoch=True)
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
            [f"{p1}" for (p1, l1) in zip(prediction, label) if l1 != -100]
            for prediction, label in zip(predictions, labels)
        ]
        true_labels = [
            [f"{l2}" for (p2, l2) in zip(prediction, label) if l2 != -100]
            for prediction, label in zip(predictions, labels)
        ]

        results = self.seqeval.compute(
            predictions=true_predictions, references=true_labels, scheme="IOB2"
        )
        assert results is not None, "SeqEval results are None"

        # Log metrics
        self.log(f"{prefix}_loss", outputs.loss, on_step=False, on_epoch=True)
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

    def predict_step(
        self, batch: dict[str, Any], batch_idx: int, dataloader_idx: int = 0
    ) -> Any:
        outputs = self.model(
            input_ids=batch["input_ids"],
            attention_mask=batch["attention_mask"],
        )
        predictions = torch.argmax(outputs.logits, dim=2).tolist()

        return {
            "ids": batch["id"],
            "predictions": predictions,
        }

    def configure_optimizers(self) -> torch.optim.Optimizer:
        optimizer = torch.optim.AdamW(
            self.parameters(), lr=self.learning_rate, weight_decay=self.weight_decay
        )
        return optimizer


class SpanClassificationModelService(TextClassificationModelService):
    def _retrieve_and_build_dataset(
        self,
        db: Session,
        sdoc_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        classid2labelid: dict[int, int],
        tokenizer,
    ) -> tuple[dict[int, dict[int, list[SpanAnnotationORM]]], Dataset]:
        """
        Retrieves, groups, and builds the dataset from the database for model training or evaluation.
        """
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
            annotation, adoc = row.tuple()
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
        def tokenize_and_align_labels(examples):
            tokenized_inputs = tokenizer(
                examples["words"], truncation=True, is_split_into_words=True
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
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        # 1. Create dataset
        # Find documents
        sdoc_ids = [
            sdoc.id
            for sdoc in crud_sdoc.read_all_with_tags(
                db=db,
                project_id=payload.project_id,
                tag_ids=parameters.tag_ids,
            )
        ]

        # Get codes and create mapping
        codes = crud_code.read_by_ids(db=db, ids=parameters.class_ids)
        classid2labelid: dict[int, int] = {
            code.id: i + 1 for i, code in enumerate(codes)
        }
        classid2labelid[0] = 0

        # Build dataset
        user_id2sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            sdoc_ids=sdoc_ids,
            user_ids=parameters.user_ids,
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
        # Initialize the Lightning Model
        lightning_model = SpanClassificationLightningModel(
            base_name=parameters.base_name,
            num_labels=len(classid2labelid),
            learning_rate=parameters.learning_rate,
            weight_decay=parameters.weight_decay,
            class_weights=torch.tensor(class_weights, dtype=torch.float32),
        )

        # Create the Trainer
        model_name: str = str(uuid4())
        model_dir = FilesystemRepo().get_model_dir(
            proj_id=payload.project_id,
            model_name=model_name,
            model_prefix="span_classifier_",
        )

        log_dir = model_dir / "logs"
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
                patience=3,  # You can adjust this value
            )
            callbacks.append(early_stopping_callback)

        trainer = pl.Trainer(
            logger=csv_logger,
            max_epochs=parameters.epochs,
            callbacks=callbacks,
            enable_progress_bar=True,
        )

        # 3. Train the model
        trainer.fit(
            lightning_model,
            train_dataloaders=train_dataloader,
            val_dataloaders=val_dataloader,
        )

        # 4. Evaluate the best model
        best_model = SpanClassificationLightningModel.load_from_checkpoint(
            checkpoint_callback.best_model_path
        )
        eval_results = trainer.validate(best_model, dataloaders=val_dataloader)[0]

        # 5. Retrieve training statistics from the logs
        metrics_df = pd.read_csv(csv_logger.log_dir + "/metrics.csv")
        # filter out all rows where train_loss is NaN
        train_df = metrics_df[metrics_df["train_loss"].notna()]
        # read the columns "epoch" and "train_loss"
        train_loss_df = train_df[["epoch", "train_loss"]]
        # convert to a list that contains dicts of {"epoch": 0, "train_loss": 1}, ... etc
        train_loss_list = train_loss_df.to_dict(orient="records")  # type: ignore

        # 6. Store results
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

        # 1. Get the trained classifier and its label mappings from the database
        classifier = crud_classifier.read(db=db, id=parameters.classifier_id)
        classid2labelid = {v: int(k) for k, v in classifier.labelid2classid.items()}
        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        # 2. Create dataset
        # Find documents
        sdoc_ids = [
            sdoc.id
            for sdoc in crud_sdoc.read_all_with_tags(
                db=db,
                project_id=payload.project_id,
                tag_ids=parameters.tag_ids,
            )
        ]

        # Build dataset
        user_id2sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            sdoc_ids=sdoc_ids,
            user_ids=parameters.user_ids,
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

        # Dataset statistics (number of annotations per code)
        eval_dataset_stats: dict[int, int] = {
            code_id: 0 for code_id, label_id in classid2labelid.items() if label_id != 0
        }
        for sdoc_id, user_id in zip(dataset["sdoc_id"], dataset["user_id"]):
            for annotation in user_id2sdoc_id2annotations[user_id][sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Load the model
        model = SpanClassificationLightningModel.load_from_checkpoint(classifier.path)

        # 4. Eval model
        trainer = pl.Trainer()
        eval_results = trainer.test(model, dataloaders=test_dataloader)[0]

        # 5. Store the evaluation in the DB
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

        # 1. Get the trained classifier and its label mappings from the database
        classifier = crud_classifier.read(db=db, id=parameters.classifier_id)
        tokenizer = AutoTokenizer.from_pretrained(classifier.base_model)
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

        # 2. Create dataset
        # Get source document data
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=parameters.sdoc_ids)
        inference_dataset = [
            {"id": sdoc_data.id, "words": sdoc_data.tokens} for sdoc_data in sdoc_datas
        ]

        # Construct a tokenized huggingface dataset
        def tokenize_for_inference(examples):
            tokenized_inputs = tokenizer(
                examples["words"], truncation=True, is_split_into_words=True
            )
            return tokenized_inputs

        hf_dataset = Dataset.from_list(inference_dataset)
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
        model = SpanClassificationLightningModel.load_from_checkpoint(classifier.path)

        # 4. Predict with model
        trainer = pl.Trainer()
        predictions = trainer.predict(model, dataloaders=inference_dataloader)
        assert predictions is not None, "No predictions returned!"

        # TODO: Test huggingface pipeline for inference! may be better
        # https://huggingface.co/docs/transformers/main_classes/pipelines

        # 5. Post-process predictions
        # predicted_annotations = []
        # for pred_batch in predictions:
        #     sdoc_ids_batch = pred_batch["ids"]
        #     predicted_labels = pred_batch["predictions"]

        #     # Map predictions to tokens and create annotations
        #     for i, sdoc_id in enumerate(sdoc_ids_batch):
        #         sdoc_tokens = sdoc_id2data[sdoc_id].tokens
        #         current_word_ids = word_ids_batch[i]
        #         current_predicted_labels = predicted_labels[i]

        #         # We need to find spans of consecutive predicted labels
        #         current_annotations: list[SpanAnnotationORM] = []
        #         last_label = -1
        #         begin_token = -1

        #         for token_idx, word_id in enumerate(current_word_ids):
        #             if word_id is None:
        #                 continue

        #             label_id = current_predicted_labels[token_idx]

        #             if label_id != last_label:
        #                 # End of a span, if one exists
        #                 if last_label > 0:
        #                     code_id = labelid2codeid.get(last_label)
        #                     if code_id is not None:
        #                         current_annotations.append(
        #                             SpanAnnotationORM(
        #                                 source_document_id=sdoc_id,
        #                                 code_id=code_id,
        #                                 begin_token=begin_token,
        #                                 end_token=word_id,  # This is the index of the next word, so it's a valid end
        #                             )
        #                         )

        #                 # Start of a new span, if not 'O'
        #                 if label_id > 0:
        #                     begin_token = word_id

        #             last_label = label_id

        #         # Check for a final span at the end of the document
        #         if last_label > 0:
        #             code_id = labelid2codeid.get(last_label)
        #             if code_id is not None:
        #                 current_annotations.append(
        #                     SpanAnnotationORM(
        #                         source_document_id=sdoc_id,
        #                         code_id=code_id,
        #                         begin_token=begin_token,
        #                         end_token=len(sdoc_tokens),
        #                     )
        #                 )

        #         predicted_annotations.append(
        #             ClassifierInferencePrediction(
        #                 sdoc_id=sdoc_id,
        #                 annotations=current_annotations,
        #             )
        #         )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )
