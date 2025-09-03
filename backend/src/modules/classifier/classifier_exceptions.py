from modules.classifier.classifier_dto import ClassifierModel, ClassifierTask


class UnsupportedClassifierJobError(Exception):
    def __init__(self, task_type: ClassifierTask, model_type: ClassifierModel) -> None:
        super().__init__(
            f"Task type {task_type} with model type {model_type} is not supported!"
        )


class BaseModelDoesNotExistError(Exception):
    def __init__(self, base_model_name: str) -> None:
        super().__init__(
            f"Base model '{base_model_name}' does not exist on Hugging Face!"
        )
