from app.core.vector.dto.object_identifier import ObjectIdentifier
from pydantic import Field


class TopicObjectIdentifier(ObjectIdentifier):
    """Identifier for Topic objects"""

    aspect_id: int = Field(description="Aspect ID")
    topic_id: int = Field(description="Topic ID")

    def __str__(self) -> str:
        return f"aspect_{self.aspect_id}_topic_{self.topic_id}"
