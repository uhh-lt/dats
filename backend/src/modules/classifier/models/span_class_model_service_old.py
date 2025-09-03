from collections import defaultdict
from typing import TypedDict
from uuid import uuid4

import evaluate
import numpy as np
from datasets import Dataset
from sqlalchemy.orm import Session
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
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
    id: int
    words: list[str]
    labels: list[int]


class SpanClassificationModelServiceOLD(TextClassificationModelService):
    def __init__(self):
        self.seqeval = evaluate.load("seqeval")

    def compute_metrics(self, p):
        predictions, labels = p
        predictions = np.argmax(predictions, axis=2)

        true_predictions = [
            [f"{p1}" for (p1, l1) in zip(prediction, label) if l1 != -100]
            for prediction, label in zip(predictions, labels)
        ]
        true_labels = [
            [f"{l2}" for (p2, l2) in zip(prediction, label) if l2 != -100]
            for prediction, label in zip(predictions, labels)
        ]

        results = self.seqeval.compute(
            predictions=true_predictions, references=true_labels
        )
        assert results is not None
        return {
            "precision": results["overall_precision"],
            "recall": results["overall_recall"],
            "f1": results["overall_f1"],
            "accuracy": results["overall_accuracy"],
        }

    def _retrieve_and_build_dataset(
        self,
        db: Session,
        sdoc_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        classid2labelid: dict[int, int],
        tokenizer,
    ) -> tuple[dict[int, list[SpanAnnotationORM]], Dataset]:
        """
        Retrieves, groups, and builds the dataset from the database for model training or evaluation.
        """
        # Get annotations
        results = (
            db.query(
                SpanAnnotationORM,
                AnnotationDocumentORM.source_document_id,
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

        # Group annotations by source document
        sdoc_id2annotations: dict[int, list[SpanAnnotationORM]] = defaultdict(list)
        for r in results:
            sdoc_id2annotations[r[1]].append(r[0])

        # Merge annotations
        dataset: list[DatasetRow] = []
        for sdoc_data in sdoc_datas:
            annotations = sdoc_id2annotations.get(sdoc_data.id, [])
            words = sdoc_data.tokens
            labels = [0 for word in words]  # 0 is class id and label id for "O"
            for annotation in annotations:
                labels[annotation.begin_token : annotation.end_token] = [
                    classid2labelid.get(annotation.code_id, 0)
                ] * (annotation.end_token - annotation.begin_token)
            dataset.append({"id": sdoc_data.id, "words": words, "labels": labels})

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

        return sdoc_id2annotations, tokenized_hf_dataset

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
        sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            sdoc_ids=sdoc_ids,
            user_ids=parameters.user_ids,
            class_ids=parameters.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
        )

        # Train test split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)
        train_dataset = split_dataset["train"]
        test_dataset = split_dataset["test"]

        # Dataset statistics (number of annotations per code)
        train_dataset_stats: dict[int, int] = defaultdict(int)
        for sdoc_id in train_dataset["id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                train_dataset_stats[annotation.code_id] += 1
        eval_dataset_stats: dict[int, int] = defaultdict(int)
        for sdoc_id in test_dataset["id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Train model
        model = AutoModelForTokenClassification.from_pretrained(
            parameters.base_name,
            num_labels=len(classid2labelid),
        )

        model_dir = FilesystemRepo().get_model_dir(
            proj_id=payload.project_id,
            model_name=str(uuid4()),
            model_prefix="span_classifier_",
        )
        training_args = TrainingArguments(
            output_dir=str(model_dir.absolute()),
            learning_rate=parameters.learning_rate,
            per_device_train_batch_size=parameters.batch_size,
            per_device_eval_batch_size=parameters.batch_size,
            num_train_epochs=parameters.epochs,
            weight_decay=parameters.weight_decay,
            eval_strategy="epoch",
            save_strategy="epoch",
            logging_strategy="epoch",
            push_to_hub=False,
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            save_total_limit=1,
        )

        callbacks = []
        if parameters.early_stopping:
            callbacks.append(EarlyStoppingCallback(early_stopping_patience=3))

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=test_dataset,
            processing_class=tokenizer,
            data_collator=data_collator,
            compute_metrics=self.compute_metrics,
            callbacks=callbacks,
        )

        trainer.train()

        # 4. Eval the best model
        eval_stats = trainer.evaluate()

        # 5. Retrieve training statistics from the logs
        train_loss = []
        for log in trainer.state.log_history:
            if "loss" in log:
                train_loss.append(
                    {
                        "epoch": log["epoch"],
                        "loss": log["loss"],
                    }
                )
        # convert to a sorted list (by epoch, ascending)
        train_loss = sorted(train_loss, key=lambda x: x["epoch"])

        # 6. Store results
        # 6.1 store the classifier in the db
        classifier = crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model=parameters.base_name,
                type=payload.model_type,
                path=trainer.state.best_model_checkpoint or "ERROR!",
                project_id=payload.project_id,
                labelid2classid={v: k for k, v in classid2labelid.items()},
                train_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in train_dataset_stats.items()
                ],
                train_loss=[
                    ClassifierLoss(step=x["epoch"], value=x["loss"]) for x in train_loss
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
                f1=eval_stats["eval_f1"],
                precision=eval_stats["eval_precision"],
                recall=eval_stats["eval_recall"],
                accuracy=eval_stats["eval_accuracy"],
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
        sdoc_id2annotations, dataset = self._retrieve_and_build_dataset(
            db=db,
            sdoc_ids=sdoc_ids,
            user_ids=parameters.user_ids,
            class_ids=classifier.class_ids,
            classid2labelid=classid2labelid,
            tokenizer=tokenizer,
        )

        # dataset statistics (number of annotations per code)
        eval_dataset_stats: dict[int, int] = defaultdict(int)
        for sdoc_id in dataset["id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 3. Load & Init model
        model = None

        # 4. Eval model
        trainer = Trainer(
            model=model,  # type: ignore
            eval_dataset=dataset,
            processing_class=tokenizer,
            data_collator=data_collator,
            compute_metrics=self.compute_metrics,
        )
        eval_stats2 = trainer.evaluate()

        # 5. Store the evaluation in the DB
        classifier_db_obj = crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=classifier.id,
                f1=eval_stats2["test_f1"],
                precision=eval_stats2["test_precision"],
                recall=eval_stats2["test_recall"],
                accuracy=eval_stats2["test_accuracy"],
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

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )
