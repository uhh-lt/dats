from typing import List

from pydantic import BaseModel, Field

from app.core.data.dto.topic import TopicRead


class TMDoc(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    topic_id: int = Field(description="ID of the topic this document belongs to")
    x: float = Field(description="X coordinate of the document in the visualization")
    y: float = Field(description="Y coordinate of the document in the visualization")
    is_accepted: bool = Field(
        description="Indicates whether the document<->topic assignment is accepted by a user",
    )
    in_searchresult: bool = Field(
        description="Indicates whether the document is part of the search result",
    )


class TMVisualization(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this visualization belongs to")
    topics: List[TopicRead] = Field(description="List of topics in the visualization")
    docs: List[TMDoc] = Field(
        description="List of documents in the visualization",
    )
