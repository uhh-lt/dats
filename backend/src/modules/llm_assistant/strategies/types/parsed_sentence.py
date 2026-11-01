from typing import TypedDict


class ParsedSentence(TypedDict):
    """A single sentence the LLM classified with a code."""

    # the sentence index within the document
    sentence_id: int
    code_id: int
    # the LLM's reasoning for the classification, None if the prompt requests none
    reasoning: str | None
