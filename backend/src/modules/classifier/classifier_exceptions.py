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


class EmptyDatasetError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "The dataset is empty! No training data could be created with the "
            "given parameters (tags, annotators, classes). Please select data "
            "that contains annotations."
        )


class NoCheckpointError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "Training did not produce a model checkpoint. This usually means "
            "the validation set was empty or no validation metric was logged."
        )


class ClassifierProjectMismatchError(Exception):
    def __init__(self, classifier_id: int, project_id: int) -> None:
        super().__init__(
            f"Classifier {classifier_id} does not belong to project {project_id}!"
        )
