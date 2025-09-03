from sqlalchemy.orm import Session

from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierData,
    ClassifierEvaluationCreate,
    ClassifierEvaluationOutput,
    ClassifierEvaluationParams,
    ClassifierEvaluationRead,
    ClassifierInferenceOutput,
    ClassifierJobInput,
    ClassifierJobOutput,
    ClassifierModel,
    ClassifierRead,
    ClassifierTask,
    ClassifierTrainingOutput,
    ClassifierTrainingParams,
)
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from systems.job_system.job_dto import Job


class DocClassificationModelService(TextClassificationModelService):
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

        # store the classifier in the db
        classifier = crud_classifier.create(
            db=db,
            create_dto=ClassifierCreate(
                name=parameters.classifier_name,
                base_model="bert-base",
                type=payload.model_type,
                path="",
                project_id=payload.project_id,
                train_params=parameters.get_train_params(),
                train_data_stats=[],
                train_loss=[],
                labelid2classid={},
            ),
            codes=[],
            tags=[],
        )

        # evaluate model
        f1 = 0.1
        precision = 0.1
        recall = 0.1
        accuracy = 0.1
        eval_data_stats: list[ClassifierData] = []

        # store results in db
        classifier_db_obj = crud_classifier.add_evaluation(
            db=db,
            create_dto=ClassifierEvaluationCreate(
                classifier_id=classifier.id,
                f1=f1,
                precision=precision,
                recall=recall,
                accuracy=accuracy,
                eval_data_stats=eval_data_stats,
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

        # evaluate model
        f1 = 0.1
        precision = 0.1
        recall = 0.1
        accuracy = 0.1
        eval_data_stats: list[ClassifierData] = []

        # store results in db
        classifier_db_obj = crud_classifier.add_evaluation(
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
        assert isinstance(parameters, ClassifierInferenceOutput), (
            "Expected inference parameters!"
        )

        return ClassifierJobOutput(
            task_type=ClassifierTask.INFERENCE,
            task_output=ClassifierInferenceOutput(
                task_type=ClassifierTask.INFERENCE,
            ),
        )
