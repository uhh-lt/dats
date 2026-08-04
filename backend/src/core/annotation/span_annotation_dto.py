from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SpanAnnotationBaseDTO(BaseModel):
    begin: int = Field(description="Begin of the SpanAnnotation in characters")
    end: int = Field(description="End of the SpanAnnotation in characters")
    begin_token: int = Field(description="Begin of the SpanAnnotation in tokens")
    end_token: int = Field(description="End of the SpanAnnotation in tokens")


# Properties for creation
class SpanAnnotationCreateIntern(SpanAnnotationBaseDTO):
    project_id: int = Field(description="Project the SpanAnnotation belongs to")
    uuid: str = Field(description="UUID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the SpanAnnotation refers to"
    )


class SpanAnnotationCreate(SpanAnnotationBaseDTO):
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")


# Properties for updating
class SpanAnnotationUpdate(BaseModel, UpdateDTOBase):
    code_id: int | None = Field(
        default=None, description="Code the SpanAnnotation refers to"
    )
    begin: int | None = Field(
        default=None,
        ge=0,
        description="Begin of the SpanAnnotation in characters",
    )
    end: int | None = Field(
        default=None,
        ge=0,
        description="End of the SpanAnnotation in characters",
    )
    begin_token: int | None = Field(
        default=None,
        ge=0,
        description="Begin of the SpanAnnotation in tokens",
    )
    end_token: int | None = Field(
        default=None,
        ge=0,
        description="End of the SpanAnnotation in tokens",
    )
    span_text: str | None = Field(
        default=None,
        min_length=1,
        description="The SpanText the SpanAnnotation spans.",
    )

    @model_validator(mode="after")
    def validate_update(self):
        resize_fields = {
            "begin",
            "end",
            "begin_token",
            "end_token",
            "span_text",
        }
        provided_resize_fields = resize_fields.intersection(self.model_fields_set)

        if provided_resize_fields and provided_resize_fields != resize_fields:
            raise ValueError(
                "All span resize fields must be provided together: "
                "begin, end, begin_token, end_token, and span_text."
            )

        if provided_resize_fields:
            resize_values = (
                self.begin,
                self.end,
                self.begin_token,
                self.end_token,
                self.span_text,
            )
            if any(value is None for value in resize_values):
                raise ValueError("Span resize fields must not be null.")

            if self.begin is not None and self.end is not None:
                if self.begin >= self.end:
                    raise ValueError("Span begin must be smaller than span end.")

            if self.begin_token is not None and self.end_token is not None:
                if self.begin_token >= self.end_token:
                    raise ValueError(
                        "Span begin_token must be smaller than span end_token."
                    )

        if "code_id" in self.model_fields_set and self.code_id is None:
            raise ValueError("code_id must not be null.")

        if self.code_id is None and not provided_resize_fields:
            raise ValueError("At least one span annotation update must be provided.")

        return self


class SpanAnnotationUpdateBulk(BaseModel, UpdateDTOBase):
    span_annotation_id: int = Field(description="ID of the SpanAnnotation")
    code_id: int = Field(description="Code the SpanAnnotation refers to")


# Properties for reading (as in ORM)
class SpanAnnotationRead(SpanAnnotationBaseDTO):
    id: int = Field(description="ID of the SpanAnnotation")
    text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
    group_ids: list[int] = Field(
        description="The group ids this span annotations belongs to"
    )
    memo_ids: list[int] = Field(description="Memo IDs attached to the SpanAnnotation")
    model_config = ConfigDict(from_attributes=True)


class SpanAnnotationDeleted(SpanAnnotationBaseDTO):
    id: int = Field(description="ID of the SpanAnnotation")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
    model_config = ConfigDict(from_attributes=True)
