from pydantic import Field

from repos.vector.weaviate_models import ObjectIdentifier


class ClusterObjectIdentifier(ObjectIdentifier):
    """Identifier for Cluster objects"""

    aspect_id: int = Field(description="Aspect ID")
    cluster_id: int = Field(description="Cluster ID")

    def __str__(self) -> str:
        return f"aspect_{self.aspect_id}_cluster_{self.cluster_id}"
