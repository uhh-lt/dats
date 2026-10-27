from enum import Enum


class AgreementAnnotationType(str, Enum):
    """The kind of annotations that are compared."""

    SPAN = "span"
    """Span annotations: their constituents are words (tokens)."""
    SENTENCE = "sentence"
    """Sentence annotations: their constituents are sentences."""


class AgreementScoring(str, Enum):
    """How the annotations of two annotators are split into scoring units."""

    EXACT = "exact"
    """Every annotation is a unit: it matches only with identical boundaries
    (the same first and last word or sentence)."""
    CONSTITUENTS = "constituents"
    """Every constituent (word or sentence) is a unit: it matches if it carries the
    same code on both sides, wherever the annotations begin or end."""
