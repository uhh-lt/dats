from collections import defaultdict
from typing import Callable, Self

import evaluate
import numpy as np
from datasets import Dataset
from sqlalchemy.orm import Session
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.doc.source_document_data_crud import crud_sdoc_data
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierData,
    ClassifierEvaluationCreate,
    ClassifierEvaluationOutput,
    ClassifierEvaluationParams,
    ClassifierInferenceOutput,
    ClassifierJobInput,
    ClassifierJobOutput,
    ClassifierLoss,
    ClassifierModel,
    ClassifierTask,
    ClassifierTrainingOutput,
    ClassifierTrainingParams,
)
from modules.classifier.classifier_exceptions import UnsupportedClassifierJobError
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job


class ClassifierService(metaclass=SingletonMeta):
    """
    **Important:**
    This service is designed to run in the GPU worker and requires GPU access. It is not intended to be used in a non-worker context!
    """

    def __new__(cls, *args, **kwargs):
        # map from job_type to function
        cls.method_for_model_and_task: dict[
            ClassifierModel,
            dict[
                ClassifierTask,
                Callable[
                    [Self, Session, Job, ClassifierJobInput],
                    ClassifierJobOutput,
                ],
            ],
        ] = {
            ClassifierModel.DOCUMENT: {
                ClassifierTask.TRAINING: cls._train_doc_model,
                ClassifierTask.EVALUATION: cls._eval_doc_model,
                ClassifierTask.INFERENCE: cls._infer_doc_model,
            },
            ClassifierModel.SENTENCE: {
                ClassifierTask.TRAINING: cls._train_sent_model,
                ClassifierTask.EVALUATION: cls._eval_sent_model,
                ClassifierTask.INFERENCE: cls._infer_sent_model,
            },
            ClassifierModel.SPAN: {
                ClassifierTask.TRAINING: cls._train_span_model,
                ClassifierTask.EVALUATION: cls._eval_span_model,
                ClassifierTask.INFERENCE: cls._infer_span_model,
            },
        }

        return super(ClassifierService, cls).__new__(cls)

    def _next_llm_job_step(self, job: Job, description: str) -> None:
        job.update(current_step=job.get_current_step() + 1, status_message=description)

    def _update_llm_job_description(self, job: Job, description: str) -> None:
        job.update(status_message=description)

    def handle_classifier_job(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        job.update(
            current_step=0,
            status_message="Started ClassifierJob!",
        )

        # get the method
        classifier_method = self.method_for_model_and_task[payload.model_type][
            payload.task_type
        ]
        if classifier_method is None:
            raise UnsupportedClassifierJobError(payload.task_type, payload.model_type)

        # execute the llm_method with the provided specific parameters
        result = classifier_method(self, db, job, payload)

        job.update(
            current_step=len(job.get_steps()) - 1,
            status_message="Finished LLMJob successfully!",
        )

        return result

    def _train_doc_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # store the classifier in the db
        crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model="bert-base",
                type=payload.model_type,
                path="",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                train_data_stats=[],
                train_loss=[],
                labelid2classid={},
            ),
            codes=[],
            tags=[],
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.TRAINING,
            task_output=ClassifierTrainingOutput(
                task_type=ClassifierTask.TRAINING, train_loss=[], train_data_stats=[]
            ),
        )

    def _eval_doc_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierEvaluationParams), (
            "Expected eval parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.EVALUATION,
            task_output=ClassifierEvaluationOutput(
                task_type=ClassifierTask.EVALUATION,
                f1=0.1,
                precision=0.1,
                accuracy=0.2,
                recall=0.3,
                eval_data_stats=[],
            ),
        )

    def _infer_doc_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.DOCUMENT, (
            "Expected DOCUMENT model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierInferenceOutput), (
            "Expected inference parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )

    def _train_sent_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # store the classifier in the db
        crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model="bert-base",
                type=payload.model_type,
                path="",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                train_data_stats=[],
                train_loss=[],
                labelid2classid={},
            ),
            codes=[],
            tags=[],
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.TRAINING,
            task_output=ClassifierTrainingOutput(
                task_type=ClassifierTask.TRAINING, train_loss=[], train_data_stats=[]
            ),
        )

    def _eval_sent_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierEvaluationParams), (
            "Expected eval parameters!"
        )

        # read classifier form db
        classifier = crud_classifier.read(db=db, id=parameters.classifier_id)
        assert classifier.type == payload.model_type, "Classifier model type mismatch!"

        # load model

        # load & create evaluation data

        # evaluate model
        f1 = 0.1
        precision = 0.1
        recall = 0.1
        accuracy = 0.1
        eval_data_stats: list[ClassifierData] = []

        # store results in db
        crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=parameters.classifier_id,
                f1=f1,
                precision=precision,
                recall=recall,
                accuracy=accuracy,
                eval_data_stats=eval_data_stats,
            ),
        )

        # return results
        return ClassifierJobOutput(
            task_type=ClassifierTask.EVALUATION,
            task_output=ClassifierEvaluationOutput(
                task_type=ClassifierTask.EVALUATION,
                f1=f1,
                precision=precision,
                accuracy=accuracy,
                recall=recall,
                eval_data_stats=eval_data_stats,
            ),
        )

    def _infer_sent_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SENTENCE, (
            "Expected SENTENCE model type!"
        )
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierInferenceOutput), (
            "Expected inference parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )

    def _train_span_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierTrainingParams), (
            "Expected training parameters!"
        )

        # 1. get all required data:
        # 1.1 get annotations
        results = (
            db.query(
                SpanAnnotationORM,
                AnnotationDocumentORM.source_document_id,
            )
            .join(SpanAnnotationORM.annotation_document)
            .filter(
                AnnotationDocumentORM.user_id.in_(parameters.user_ids),
                AnnotationDocumentORM.source_document_id.in_(parameters.sdoc_ids),
                SpanAnnotationORM.code_id.in_(parameters.class_ids),
            )
            .all()
        )

        # 1.2 get source document data
        sdoc_ids: list[int] = list({r[1] for r in results})
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=sdoc_ids)

        # 1.3 group annotations by source document
        sdoc_id2annotations: dict[int, list[SpanAnnotationORM]] = defaultdict(list)
        for r in results:
            sdoc_id2annotations[r[1]].append(r[0])

        # 1.4 get codes
        code_ids: list[int] = list({r[0].code_id for r in results})
        codes = crud_code.read_by_ids(db=db, ids=code_ids)

        # 1.5 convert codes -> labels
        codeid2labelid = {code.id: i + 1 for i, code in enumerate(codes)}
        labelid2codeid = {i + 1: code.id for i, code in enumerate(codes)}
        label_names = ["O"] + [code.name for code in codes]
        id2label = {i: name for i, name in enumerate(label_names)}
        label2id = {name: i for i, name in enumerate(label_names)}

        # 2. Create dataset
        # 2.1 merge annotations into source document
        dataset = []
        for sdoc_data in sdoc_datas:
            annotations = sdoc_id2annotations.get(sdoc_data.id, [])

            words = sdoc_data.tokens

            # init labels with all zeros
            labels = [0 for word in words]

            # set labels for each annotation
            for annotation in annotations:
                labels[annotation.begin_token : annotation.end_token] = [
                    codeid2labelid[annotation.code_id]
                ] * (annotation.end_token - annotation.begin_token)

            dataset.append({"id": sdoc_data.id, "words": words, "labels": labels})

        hf_dataset = Dataset.from_list(dataset)

        # 2.2 tokenize the dataset
        tokenizer = AutoTokenizer.from_pretrained("distilbert/distilbert-base-uncased")
        data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

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

        tokenized_hf_dataset = hf_dataset.map(tokenize_and_align_labels, batched=True)

        # 2.3 train test split
        split_dataset = tokenized_hf_dataset.train_test_split(test_size=0.2, seed=42)
        train_dataset = split_dataset["train"]
        test_dataset = split_dataset["test"]

        # 3. Setup evaluation function
        seqeval = evaluate.load("seqeval")

        def compute_metrics(p):
            predictions, labels = p
            predictions = np.argmax(predictions, axis=2)

            # Assigning the label -100 to the special tokens [CLS] and [SEP] so they’re ignored by the PyTorch loss function
            true_predictions = [
                [label_names[p1] for (p1, l1) in zip(prediction, label) if l1 != -100]
                for prediction, label in zip(predictions, labels)
            ]
            true_labels = [
                [label_names[l2] for (p2, l2) in zip(prediction, label) if l2 != -100]
                for prediction, label in zip(predictions, labels)
            ]

            results = seqeval.compute(
                predictions=true_predictions, references=true_labels
            )
            assert results is not None
            return {
                "precision": results["overall_precision"],
                "recall": results["overall_recall"],
                "f1": results["overall_f1"],
                "accuracy": results["overall_accuracy"],
            }

        # 4. Train model
        model = AutoModelForTokenClassification.from_pretrained(
            "distilbert/distilbert-base-uncased",
            num_labels=len(id2label),
            id2label=id2label,
            label2id=label2id,
        )

        model_dir = FilesystemRepo().get_model_dir(
            proj_id=payload.project_id,
            model_name=parameters.classifier_name,
            model_prefix="span_classifier_",
        )
        training_args = TrainingArguments(
            output_dir=str(model_dir.absolute()),
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=2,
            weight_decay=0.01,
            eval_strategy="epoch",
            save_strategy="epoch",
            logging_strategy="epoch",
            push_to_hub=False,
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=test_dataset,
            processing_class=tokenizer,
            data_collator=data_collator,
            compute_metrics=compute_metrics,
        )

        trainer.train()

        # 5. Get Training and eval statistics from the logs
        # 5.1 metrics
        eval_stats = {
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "accuracy": 0.0,
        }
        train_loss = []
        for log in trainer.state.log_history:
            if "eval_loss" in log and log["eval_loss"] == trainer.state.best_metric:
                eval_stats["accuracy"] = log["eval_accuracy"]
                eval_stats["precision"] = log["eval_precision"]
                eval_stats["recall"] = log["eval_recall"]
                eval_stats["f1"] = log["eval_f1"]
            if "train_loss" in log:
                train_loss.append(
                    {
                        "epoch": log["epoch"],
                        "loss": log["train_loss"],
                    }
                )
        # convert to a sorted list (by epoch, ascending)
        train_loss = sorted(train_loss, key=lambda x: x["epoch"])

        # 5.2 data statistics
        train_dataset_stats: dict[int, int] = defaultdict(int)
        for sdoc_id in train_dataset["id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                train_dataset_stats[annotation.code_id] += 1
        eval_dataset_stats: dict[int, int] = defaultdict(int)
        for sdoc_id in test_dataset["id"]:
            for annotation in sdoc_id2annotations[sdoc_id]:
                eval_dataset_stats[annotation.code_id] += 1

        # 6. Store results
        # 6.1 store the classifier in the db
        classifier = crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model="distilbert/distilbert-base-uncased",
                type=payload.model_type,
                path=trainer.state.best_model_checkpoint or "ERROR!",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                labelid2classid=labelid2codeid,
                train_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in train_dataset_stats.items()
                ],
                train_loss=[
                    ClassifierLoss(step=x["epoch"], value=x["loss"]) for x in train_loss
                ],
            ),
            codes=codes,
            tags=[],
        )

        # 6.2 store the evaluation in the db
        crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=classifier.id,
                f1=eval_stats["f1"],
                precision=eval_stats["precision"],
                recall=eval_stats["recall"],
                accuracy=eval_stats["accuracy"],
                eval_data_stats=[
                    ClassifierData(class_id=code_id, num_examples=count)
                    for code_id, count in eval_dataset_stats.items()
                ],
            ),
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.TRAINING,
            task_output=ClassifierTrainingOutput(
                task_type=ClassifierTask.TRAINING, train_loss=[], train_data_stats=[]
            ),
        )

    def _eval_span_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierEvaluationParams), (
            "Expected eval parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.EVALUATION,
            task_output=ClassifierEvaluationOutput(
                task_type=ClassifierTask.EVALUATION,
                f1=0.1,
                precision=0.1,
                accuracy=0.2,
                recall=0.3,
                eval_data_stats=[],
            ),
        )

    def _infer_span_model(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        assert payload.model_type == ClassifierModel.SPAN, "Expected SPAN model type!"
        parameters = payload.task_parameters
        assert isinstance(parameters, ClassifierInferenceOutput), (
            "Expected inference parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )
