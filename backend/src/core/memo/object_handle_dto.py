from pydantic import BaseModel, ConfigDict, Field, model_validator


# Properties shared across all DTOs
class ObjectHandleBaseDTO(BaseModel):
    user_id: int | None = Field(
        description="User the ObjectHandle refers to", default=None
    )
    project_id: int | None = Field(
        description="Project the ObjectHandle refers to", default=None
    )
    code_id: int | None = Field(
        description="Code the ObjectHandle refers to", default=None
    )
    source_document_id: int | None = Field(
        description="SourceDocument the ObjectHandle refers to", default=None
    )
    span_annotation_id: int | None = Field(
        description="SpanAnnotation the ObjectHandle refers to", default=None
    )
    sentence_annotation_id: int | None = Field(
        description="SentenceAnnotation the ObjectHandle refers to", default=None
    )
    span_group_id: int | None = Field(
        description="SpanGroup the ObjectHandle refers to", default=None
    )
    bbox_annotation_id: int | None = Field(
        description="BBoxAnnotation the ObjectHandle refers to", default=None
    )
    tag_id: int | None = Field(
        description="Tag the ObjectHandle refers to", default=None
    )
    memo_id: int | None = Field(
        description="Memo the ObjectHandle refers to", default=None
    )

    @model_validator(mode="after")
    def check_at_least_one_not_null(self):
        # make sure that at least one of the fields is not null
        values = self.model_dump()
        for val in values.values():
            if val is not None:
                return self
        raise ValueError("At least one of the fields has to be not null!")


# Properties for creation
class ObjectHandleCreate(ObjectHandleBaseDTO):
    pass


# Properties for reading (as in ORM)
class ObjectHandleRead(ObjectHandleBaseDTO):
    id: int = Field(description="ID of the ObjectHandle")
    model_config = ConfigDict(from_attributes=True)
