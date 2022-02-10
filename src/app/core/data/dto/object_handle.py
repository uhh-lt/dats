from typing import Optional

from pydantic import BaseModel, root_validator


# Properties shared across all DTOs
class ObjectHandleBaseDTO(BaseModel):
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    code_id: Optional[int] = None
    current_code_id: Optional[int] = None
    source_document_id: Optional[int] = None
    source_document_metadata_id: Optional[int] = None
    annotation_document_id: Optional[int] = None
    span_annotation_id: Optional[int] = None
    document_tag_id: Optional[int] = None
    action_id: Optional[int] = None
    action_target_id: Optional[int] = None
    filter_id: Optional[int] = None
    query_id: Optional[int] = None

    # noinspection PyMethodParameters
    @root_validator
    def check_at_least_one_not_null(cls, values):
        for val in values:
            if val:
                return values
        raise ValueError("At least one of the fields has to be not null!")


# Properties for creation
class ObjectHandleCreate(ObjectHandleBaseDTO):
    pass


# Properties for reading (as in ORM)
class ObjectHandleRead(ObjectHandleBaseDTO):
    id: int

    class Config:
        orm_mode = True
