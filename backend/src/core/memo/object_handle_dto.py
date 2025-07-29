from pydantic import BaseModel, ConfigDict, model_validator


# Properties shared across all DTOs
class ObjectHandleBaseDTO(BaseModel):
    user_id: int | None = None
    project_id: int | None = None
    code_id: int | None = None
    source_document_id: int | None = None
    span_annotation_id: int | None = None
    sentence_annotation_id: int | None = None
    span_group_id: int | None = None
    bbox_annotation_id: int | None = None
    tag_id: int | None = None
    memo_id: int | None = None

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
    id: int
    model_config = ConfigDict(from_attributes=True)
