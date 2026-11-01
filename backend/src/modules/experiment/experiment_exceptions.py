from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ExperimentInvalidSelectionError(Exception):
    """Raised when the documents, codes, task or gold annotator of an experiment are invalid."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Invalid experiment: {cause}")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ExperimentGoldAnnotationsMissingError(Exception):
    """Raised when the gold annotator did not annotate every document of an experiment."""

    def __init__(self, gold_user_id: int, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"The gold annotator {gold_user_id} did not annotate the documents "
            f"{sdoc_ids}! Every document of an experiment must be annotated by the "
            f"gold annotator (filter 'Annotated by')."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ExperimentPromptVersionNotEligibleError(Exception):
    """Raised when a run uses a prompt version that does not fit the experiment."""

    def __init__(self, prompt_version_id: int, cause: str) -> None:
        super().__init__(
            f"Prompt version {prompt_version_id} cannot run in this experiment: {cause}"
        )
