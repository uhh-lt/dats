from loguru import logger
from weaviate import WeaviateClient
from weaviate.classes.config import Configure, Property, VectorDistances


class BaseCollection:
    name: str
    description: str
    properties: dict[str, Property]

    @classmethod
    def create_collection(cls, client: WeaviateClient):
        if not client.collections.exists(cls.name):
            client.collections.create(
                name=cls.name,
                description=cls.description,
                properties=list(cls.properties.values()),
                # All configurations below apply to all collections:
                vector_index_config=Configure.VectorIndex.hnsw(
                    distance_metric=VectorDistances.COSINE
                ),
                # Enable multi-tenancy: one project = one tenant
                multi_tenancy_config=Configure.multi_tenancy(
                    enabled=True, auto_tenant_creation=True
                ),
            )
            logger.info(
                f"Created collection '{cls.name}' with properties: {', '.join(cls.properties.keys())}"
            )
