from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SentenceAnnotationBaseDTO(BaseModel):
    sentence_id_start: int = Field(
        description="Start sentence ID of the SentenceAnnotation"
    )
    sentence_id_end: int = Field(
        description="End sentence ID of the SentenceAnnotation"
    )


# Properties for creation
class SentenceAnnotationCreateIntern(SentenceAnnotationBaseDTO):
    project_id: int = Field(description="Project the SentenceAnnotation belongs to")
    uuid: str = Field(description="UUID of the SentenceAnnotation")
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the SentenceAnnotation refers to"
    )


class SentenceAnnotationCreate(SentenceAnnotationBaseDTO):
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    sdoc_id: int = Field(description="SourceDocument the SentenceAnnotation refers to")


# Properties for updating
class SentenceAnnotationUpdate(BaseModel, UpdateDTOBase):
    code_id: int | None = Field(
        default=None, description="Code the SentenceAnnotation refers to"
    )
    sentence_id_start: int | None = Field(
        default=None,
        ge=0,
        description="Start sentence ID of the SentenceAnnotation",
    )
    sentence_id_end: int | None = Field(
        default=None,
        ge=0,
        description="End sentence ID of the SentenceAnnotation",
    )

    @model_validator(mode="after")
    def validate_update(self):
        resize_fields = {
            "sentence_id_start",
            "sentence_id_end",
        }
        provided_resize_fields = resize_fields.intersection(self.model_fields_set)

        if provided_resize_fields and provided_resize_fields != resize_fields:
            raise ValueError(
                "All sentence resize fields must be provided together: "
                "sentence_id_start and sentence_id_end."
            )

        if provided_resize_fields:
            if self.sentence_id_start is None or self.sentence_id_end is None:
                raise ValueError("Sentence resize fields must not be null.")

            if self.sentence_id_start > self.sentence_id_end:
                raise ValueError(
                    "Sentence ID start must not be larger than sentence ID end."
                )

        if "code_id" in self.model_fields_set and self.code_id is None:
            raise ValueError("code_id must not be null.")

        if self.code_id is None and not provided_resize_fields:
            raise ValueError(
                "At least one sentence annotation update must be provided."
            )

        return self


class SentenceAnnotationUpdateBulk(BaseModel, UpdateDTOBase):
    sent_annotation_id: int = Field(description="ID of the SentenceAnnotation")
    code_id: int = Field(description="Code the SentenceAnnotation refers to")


# Properties for reading (as in ORM)
class SentenceAnnotationRead(SentenceAnnotationBaseDTO):
    id: int = Field(description="ID of the SentenceAnnotation")
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User that created the SentenceAnnotation")
    sdoc_id: int = Field(description="SourceDocument the SentenceAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SentenceAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SentenceAnnotation")
    memo_ids: list[int] = Field(
        description="Memo IDs attached to the SentenceAnnotation"
    )
    model_config = ConfigDict(from_attributes=True)


class SentenceAnnotatorResult(BaseModel):
    sentence_annotations: dict[int, list[SentenceAnnotationRead]] = Field(
        description="A mapping of sentence IDs to their annotations"
    )
