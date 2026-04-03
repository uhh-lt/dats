from pydantic import Field

from schemas.answer_schema import ExtractiveQASchema


class ExtractiveQAAnswerSchemaV1(ExtractiveQASchema):
    reasoning: str = Field(
        description="Short explanation of why this answer was selected."
    )
    answer: str = Field(
        description=(
            "Extracted answer span copied from the context. "
            "If unanswerable, use the task-specific no-answer label from the prompt."
        )
    )
