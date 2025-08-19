from pydantic import Field

from repos.vector.weaviate_models import ObjectIdentifier


class SentenceObjectIdentifier(ObjectIdentifier):
    """Identifier for sentence objects"""

    sdoc_id: int = Field(description="Source document ID")
    sentence_id: int = Field(description="Sentence ID within the document")

    def __str__(self) -> str:
        return f"sdoc_{self.sdoc_id}_sentence_{self.sentence_id}"
