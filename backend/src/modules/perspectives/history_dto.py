from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class HistoryActionType(str, Enum):
    CREATE_CLUSTER_WITH_NAME = "CREATE_CLUSTER_WITH_NAME"
    CREATE_CLUSTER_WITH_SDOCS = "CREATE_CLUSTER_WITH_SDOCS"
    REMOVE_CLUSTER = "REMOVE_CLUSTER"
    MERGE_CLUSTERS = "MERGE_CLUSTERS"
    SPLIT_CLUSTER = "SPLIT_CLUSTER"
    CHANGE_CLUSTER = "CHANGE_CLUSTER"
    REFINE_MODEL = "REFINE_MODEL"
    RESET_MODEL = "RESET_MODEL"
    RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION = "RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION"


class HistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aspect_id: int
    action_type: HistoryActionType
    created_at: datetime
    # We generally don't expose undo/redo data to frontend, just the fact an action happened
