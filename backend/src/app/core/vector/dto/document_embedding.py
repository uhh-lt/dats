from app.core.vector.dto.object_identifier import ObjectIdentifier
from pydantic import Field


class DocumentObjectIdentifier(ObjectIdentifier):
    """Identifier for document objects"""

    sdoc_id: int = Field(description="Source document ID")

    def __str__(self) -> str:
        return f"sdoc_{self.sdoc_id}"
