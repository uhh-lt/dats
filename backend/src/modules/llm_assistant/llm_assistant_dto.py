from pydantic import BaseModel, Field

from core.prompt.prompt_enum import TaskType


class ExistingAnnotationCountsRequest(BaseModel):
    task_type: TaskType = Field(description="The task of the LLM Assistant run")
    virtual_user_id: int = Field(description="The virtual user of the run")
    sdoc_ids: list[int] = Field(description="The SourceDocuments of the run")
    code_ids: list[int] = Field(description="The Codes of the run")
