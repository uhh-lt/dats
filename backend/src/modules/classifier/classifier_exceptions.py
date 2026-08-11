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


class InvalidDatasetSplitError(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(
            "A class-stratified training/validation split could not be created: "
            f"{reason}"
        )


class NoCheckpointError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "Training did not produce a model checkpoint. This usually means "
            "the validation set was empty or no validation metric was logged."
        )


class EmptyEvaluationError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "The evaluation set contains no entity tokens, so no evaluation "
            "metrics could be computed. Please evaluate on data that contains "
            "annotations of the trained classes."
        )


class InvalidChunkSizeError(Exception):
    def __init__(
        self, chunk_size: int, max_chunk_size: int, base_model_name: str
    ) -> None:
        super().__init__(
            f"chunk_size={chunk_size} exceeds the maximum input length "
            f"({max_chunk_size}) of base model '{base_model_name}'. Please choose "
            f"a chunk_size of at most {max_chunk_size}."
        )
