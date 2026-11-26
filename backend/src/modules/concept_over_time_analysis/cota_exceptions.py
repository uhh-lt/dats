from common.common_exceptions import NotFoundError


class COTASentenceNotFoundError(NotFoundError):
    """Raised when a sentence is not in the search space of the COTA."""

    def __init__(self, cota_id: int, sdoc_id: int, sentence_id: int) -> None:
        super().__init__(
            f"Sentence {sentence_id} of SourceDocument {sdoc_id} is not in the "
            f"search space of ConceptOverTimeAnalysis {cota_id}."
        )
