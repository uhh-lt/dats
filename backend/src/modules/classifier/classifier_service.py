from typing import Callable, Self

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
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
                type=payload.model_type,
                path="",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                class_ids=[],
                train_data_stats=[],
                train_loss=[],
            ),
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
                eval_loss=[],
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
                type=payload.model_type,
                path="",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                class_ids=[],
                train_data_stats=[],
                train_loss=[],
            ),
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
        eval_loss: list[ClassifierLoss] = [
            ClassifierLoss(step=0, value=0.9),
            ClassifierLoss(step=1, value=0.8),
            ClassifierLoss(step=2, value=0.6),
        ]
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
                eval_loss=eval_loss,
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
                eval_loss=eval_loss,
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

        # store the classifier in the db
        crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                type=payload.model_type,
                path="",
                batch_size=parameters.batch_size,
                epochs=parameters.epochs,
                project_id=payload.project_id,
                class_ids=[],
                train_data_stats=[],
                train_loss=[],
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
                eval_loss=[],
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
