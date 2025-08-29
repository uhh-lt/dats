from modules.classifier.classifier_dto import ClassifierModel, ClassifierTask


class UnsupportedClassifierJobError(Exception):
    def __init__(self, task_type: ClassifierTask, model_type: ClassifierModel) -> None:
        super().__init__(
            f"Task type {task_type} with model type {model_type} is not supported! "
        )
