from pydantic import Field

from repos.vector.weaviate_models import ObjectIdentifier


class AspectObjectIdentifier(ObjectIdentifier):
    """Identifier for Aspect objects"""

    aspect_id: int = Field(description="Aspect ID")
    sdoc_id: int = Field(description="Source Document ID")

    def __str__(self) -> str:
        return f"aspect_{self.aspect_id}_sdoc_{self.sdoc_id}"
