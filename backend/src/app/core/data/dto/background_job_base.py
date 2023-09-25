from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class BackgroundJobStatus(str, Enum):
    WAITING = "Waiting"  # Initializing (not started yet)
    RUNNING = "Running"  # (currently in progress)
    FINISHED = "Finished"  # (successfully finished)
    ERROR = "Errorneous"  # (failed to finish)
    ABORTED = "Abborted"  # (abborted by user)


# Properties shared across all DTOs
class BackgroundJobBase(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING,
        description="Status of the BackgroundJob",
    )


# Properties to create
class BackgroundJobBaseCreate(BackgroundJobBase):
    project_id: int = Field(
        description="The ID of the Project for which the PreprocessingJob is executed."
    )


# Properties to update
class BackgroundJobBaseUpdate(BackgroundJobBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the BackgroundJob"
    )


# Properties to read
class BackgroundJobBaseRead(BackgroundJobBase):
    id: str = Field(description="ID of the BackgroundJob")
    project_id: int = Field(
        description="The ID of the Project for which the BackgroundJob is executed."
    )
    created: datetime = Field(description="Created timestamp of the BackgroundJob")
    updated: datetime = Field(description="Updated timestamp of the BackgroundJob")

    def update_status(self, status: BackgroundJobStatus) -> BackgroundJobBaseUpdate:
        self.status = status
        return BackgroundJobBaseUpdate(status=self.status)
