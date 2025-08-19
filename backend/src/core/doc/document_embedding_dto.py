from pydantic import Field

from repos.vector.weaviate_models import ObjectIdentifier


class DocumentObjectIdentifier(ObjectIdentifier):
    """Identifier for document objects"""

    sdoc_id: int = Field(description="Source document ID")

    def __str__(self) -> str:
        return f"sdoc_{self.sdoc_id}"
