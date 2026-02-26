from typing import TypedDict

from weaviate.classes.config import DataType, Property

from repos.vector.collection_base import BaseCollection


class ClusterCollectionProperties(TypedDict):
    aspect_id: Property
    cluster_id: Property


class ClusterCollection(BaseCollection):
    name = "Cluster"
    description = "Cluster vector collection"
    properties: ClusterCollectionProperties = {
        "aspect_id": Property(name="aspect_id", data_type=DataType.INT),
        "cluster_id": Property(name="cluster_id", data_type=DataType.INT),
    }
