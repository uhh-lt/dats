from enum import Enum


class AgreementMode(str, Enum):
    """How the annotations of two annotators are split into scoring units."""

    SENTENCE = "sentence"
    """Sentence annotations: every (sentence, code) pair is a unit."""
    SPAN_STRICT = "span_strict"
    """Span annotations: a span is a unit, it matches only with identical offsets."""
    SPAN_WORD = "span_word"
    """Span annotations: every word (token) is a unit, span boundaries do not matter."""
