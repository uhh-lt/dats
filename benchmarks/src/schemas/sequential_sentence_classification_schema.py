from typing import Literal

from pydantic import Field

from schemas.answer_schema import (
    SequentialSentenceAnnotation,
    SequentialSentenceClassificationSchema,
)


class CoarseDiscourseAnnotation(SequentialSentenceAnnotation):
    category: Literal[
        "question",
        "answer",
        "announcement",
        "agreement",
        "appreciation",
        "disagreement",
        "negative reaction",
        "elaboration",
        "humor",
        "other",
    ] = Field(description="The predicted discourse act category.")


class CSABStructAnnotation(SequentialSentenceAnnotation):
    category: Literal[
        "background",
        "method",
        "objective",
        "other",
        "result",
    ] = Field(description="The predicted rhetorical role category.")


class DailyDialogAnnotation(SequentialSentenceAnnotation):
    category: Literal[
        "fear",
        "disgust",
        "neutral",
        "excited",
        "anger",
        "surprise",
        "sadness",
        "joy",
    ] = Field(description="The predicted emotion category.")


class EmotionLinesAnnotation(SequentialSentenceAnnotation):
    category: Literal[
        "fear",
        "disgust",
        "excited",
        "anger",
        "surprise",
        "sadness",
        "joy",
        "neutral",
    ] = Field(description="The predicted emotion category.")


class Pubmed200KAnnotation(SequentialSentenceAnnotation):
    category: Literal[
        "background",
        "methods",
        "objective",
        "results",
        "conclusions",
    ] = Field(description="The predicted rhetorical role category.")


class CoarseDiscourseSequentialSentenceClassificationSchemaV1(
    SequentialSentenceClassificationSchema
):
    annotations: list[CoarseDiscourseAnnotation] = Field(default_factory=list)


class CSABStructSequentialSentenceClassificationSchemaV1(
    SequentialSentenceClassificationSchema
):
    annotations: list[CSABStructAnnotation] = Field(default_factory=list)


class DailyDialogSequentialSentenceClassificationSchemaV1(
    SequentialSentenceClassificationSchema
):
    annotations: list[DailyDialogAnnotation] = Field(default_factory=list)


class EmotionLinesSequentialSentenceClassificationSchemaV1(
    SequentialSentenceClassificationSchema
):
    annotations: list[EmotionLinesAnnotation] = Field(default_factory=list)


class Pubmed200KSequentialSentenceClassificationSchemaV1(
    SequentialSentenceClassificationSchema
):
    annotations: list[Pubmed200KAnnotation] = Field(default_factory=list)
