from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from modules.perspectives.perspectives_job_dto import PerspectivesJobType


class PerspectiveDBActions(str, Enum):
    UPDATE_ASPECT = "update_aspect"

    CREATE_CLUSTERS = "create_clusters"
    DELETE_CLUSTERS = "delete_clusters"
    UPDATE_CLUSTERS = "update_clusters"
    STORE_CLUSTER_EMBEDDINGS = "store_cluster_embeddings"
    REMOVE_CLUSTER_EMBEDDINGS = "remove_cluster_embeddings"

    CREATE_DOCUMENT_ASPECTS = "create_document_aspects"
    UPDATE_DOCUMENT_ASPECTS = "update_document_aspects"
    DELETE_DOCUMENT_ASPECTS = "delete_document_aspects"
    STORE_DOCUMENT_ASPECT_EMBEDDINGS = "store_document_aspect_embeddings"
    REMOVE_DOCUMENT_ASPECT_EMBEDDINGS = "remove_document_aspect_embeddings"

    CREATE_DOCUMENT_CLUSTERS = "create_document_clusters"
    DELETE_DOCUMENT_CLUSTERS = "delete_document_clusters"
    UPDATE_DOCUMENT_CLUSTERS = "update_document_clusters"


class PerspectivesHistoryBase(BaseModel):
    perspective_action: PerspectivesJobType = Field(
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


class PerspectivesHistoryCreate(PerspectivesHistoryBase):
    pass


class PerspectivesHistoryRead(PerspectivesHistoryBase):
    id: int = Field(description="ID of the history entry")

    model_config = ConfigDict(from_attributes=True)
