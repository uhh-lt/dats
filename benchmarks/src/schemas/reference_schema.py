from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class BaseReferenceSchema(BaseModel):
    @classmethod
    def create_from_reference(cls, reference: Any):
        """Parse a reference payload into a strongly typed reference object."""

        if isinstance(reference, str):
            return cls.model_validate_json(reference)

        if isinstance(reference, BaseModel):
            return cls.model_validate(reference.model_dump())

        if isinstance(reference, dict):
            return cls.model_validate(reference)

        raise TypeError(
            f"Reference must be a JSON string, dict, or pydantic model for {cls.__name__} parsing."
        )


class SingleLabelReference(BaseReferenceSchema):
    label: str = Field(min_length=1)


class MultiLabelReference(BaseReferenceSchema):
    labels: list[str] = Field(min_length=1)


class SquadReferenceAnswers(BaseModel):
    text: list[str] = Field(default_factory=list)
    answer_start: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_lengths(self) -> "SquadReferenceAnswers":
        if len(self.text) != len(self.answer_start):
            raise ValueError(
                "answers.text and answers.answer_start must have equal length."
            )
        return self


class ExtractiveQAReference(BaseReferenceSchema):
    id: str = Field(min_length=1)
    answers: SquadReferenceAnswers


class SpanClassificationReference(BaseReferenceSchema):
    tokens: list[str]
    tag_ids: list[int]
    id2label: dict[int, str]

    @model_validator(mode="after")
    def validate_lengths(self) -> "SpanClassificationReference":
        if len(self.tokens) != len(self.tag_ids):
            raise ValueError(
                "Span reference tokens and tag_ids must have the same length. "
                f"Got tokens={len(self.tokens)} and tag_ids={len(self.tag_ids)}."
            )
        return self


class SequentialSentenceClassificationReference(BaseReferenceSchema):
    sentences: list[str] = Field(min_length=1)
    labels: list[str] = Field(min_length=1)
    unwanted_labels: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_lengths(self) -> "SequentialSentenceClassificationReference":
        if len(self.sentences) != len(self.labels):
            raise ValueError(
                "Sequential sentence classification requires sentence and label sequence lengths to match. "
                f"Got sentences={len(self.sentences)} and labels={len(self.labels)}."
            )
        return self


class MUC4Reference(BaseReferenceSchema):
    incident: list[str] = Field(default_factory=list)
    perpetrator: list[str] = Field(default_factory=list)
    group_perpetrator: list[str] = Field(default_factory=list)
    victim: list[str] = Field(default_factory=list)
    target: list[str] = Field(default_factory=list)
    weapon: list[str] = Field(default_factory=list)
