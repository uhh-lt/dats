from pydantic import BaseModel, ConfigDict, Field

from modules.perspectives.enum.perspectives_db_action import PerspectiveDBActions
from modules.perspectives.enum.perspectives_user_action import PerspectivesAction
from repos.db.dto_base import UpdateDTOBase


class PerspectivesHistoryBase(BaseModel):
    perspectives_action: PerspectivesAction = Field(
        description="Type of perspective action that generated this history entry"
    )
    history_number: int = Field(
        description="The sequential number of the history entry"
    )
    is_undone: bool = Field(
        default=False, description="Whether this history entry has been undone"
    )

    undo_data: list[dict[PerspectiveDBActions, dict]] = Field(
        description="List of DB operations and their parameters required to undo the action"
    )
    redo_data: list[dict[PerspectiveDBActions, dict]] = Field(
        description="List of DB operations and their parameters required to redo the action"
    )
    aspect_id: int = Field(description="ID of the aspect this history entry belongs to")


class PerspectivesHistoryUpdate(BaseModel, UpdateDTOBase):
    is_undone: bool | None = Field(
        default=None, description="Whether this history entry has been undone"
    )


class PerspectivesHistoryCreate(PerspectivesHistoryBase):
    pass


class PerspectivesHistoryRead(PerspectivesHistoryBase):
    id: int = Field(description="ID of the history entry")

    model_config = ConfigDict(from_attributes=True)
