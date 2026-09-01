from typing import TypedDict


class ParsedSpan(TypedDict):
    """A single parsed span with absolute character offsets in the document."""

    code_id: int
    text: str
    begin: int
    end: int
