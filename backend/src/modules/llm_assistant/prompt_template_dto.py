from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from modules.llm_assistant.llm_assistant_job_dto import LLMAssistantPromptTemplates
from repos.db.dto_base import UpdateDTOBase

# --- PROMPT TEMPLATE VERSION ---


# Properties for creation
class PromptTemplateVersionCreate(BaseModel):
    prompts: list[LLMAssistantPromptTemplates] = Field(
        description="The system and user prompt of every supported language"
    )


class PromptTemplateVersionCreateIntern(PromptTemplateVersionCreate):
    prompt_template_id: int = Field(
        description="ID of the prompt template the version belongs to"
    )
    version: int = Field(description="Number of the version within its template")
    user_id: int | None = Field(description="ID of the user who saved the version")


# Properties for reading (as in ORM)
class PromptTemplateVersionRead(PromptTemplateVersionCreate):
    id: int = Field(description="ID of the prompt template version")
    prompt_template_id: int = Field(
        description="ID of the prompt template the version belongs to"
    )
    version: int = Field(
        description="Number of the version within its template (1, 2, 3, ...)"
    )
    user_id: int | None = Field(description="ID of the user who saved the version")
    created: datetime = Field(description="Created timestamp of the version")
    model_config = ConfigDict(from_attributes=True)


# --- PROMPT TEMPLATE ---


# Properties shared across all DTOs
class PromptTemplateBaseDTO(BaseModel):
    name: str = Field(description="Name of the prompt template", min_length=1)
    task_type: TaskType = Field(description="The LLM assistant task of the template")
    strategy_type: StrategyType = Field(
        description="The strategy that renders the template"
    )


# Properties for creation
class PromptTemplateCreate(PromptTemplateBaseDTO):
    project_id: int = Field(description="Project the prompt template belongs to")
    prompts: list[LLMAssistantPromptTemplates] = Field(
        description="The prompts of the first version, one per supported language"
    )


class PromptTemplateCreateIntern(PromptTemplateBaseDTO):
    project_id: int = Field(description="Project the prompt template belongs to")


# Properties for updating
class PromptTemplateUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(
        description="Name of the prompt template", min_length=1, default=None
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name"})


# Properties for reading (as in ORM)
class PromptTemplateRead(PromptTemplateBaseDTO):
    id: int = Field(description="ID of the prompt template")
    project_id: int = Field(description="Project the prompt template belongs to")
    created: datetime = Field(description="Created timestamp of the prompt template")
    updated: datetime = Field(description="Updated timestamp of the prompt template")
    versions: list[PromptTemplateVersionRead] = Field(
        description="All versions of the template, oldest first"
    )
    model_config = ConfigDict(from_attributes=True)
