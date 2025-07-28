from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class TrainerJobParameters(BaseModel):
    project_id: int = Field(description="The ID of the Project.")
    train_model_name: str = Field(description="The name of the model.")
    train_dataloader_name: str = Field(
        description="The name of the training dataloader.",
    )
    epochs: int = Field(description="The epochs to train.")


# Properties shared across all DTOs
class TrainerJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the TrainerJob"
    )


# Properties to create
class TrainerJobCreate(TrainerJobBaseDTO):
    parameters: TrainerJobParameters = Field(
        description="The parameters of the TrainerJob that defines how to train the model!"
    )


# Properties to update
class TrainerJobUpdate(TrainerJobBaseDTO, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the TrainerJob"
    )


# Properties to read
class TrainerJobRead(TrainerJobBaseDTO):
    id: str = Field(description="ID of the TrainerJob")
    parameters: TrainerJobParameters = Field(
        description="The parameters of the TrainerJob that defines how to train!"
    )
    saved_model_path: Optional[str] = Field(
        default=None, description="The path to the saved model."
    )
    created: datetime = Field(description="Created timestamp of the TrainerJob")
    updated: datetime = Field(description="Updated timestamp of the TrainerJob")
