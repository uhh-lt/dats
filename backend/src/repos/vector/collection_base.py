from loguru import logger
from weaviate import WeaviateClient
from weaviate.classes.config import Configure, Property, VectorDistances

from config import conf
from utils.import_utils import import_by_suffix

_collections: list[type["BaseCollection"]] = []
_collections_imported = False


class BaseCollection:
    name: str
    description: str
    properties: dict[str, Property]

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        _collections.append(cls)

    @staticmethod
    def all_collections() -> list[type["BaseCollection"]]:
        """All Weaviate collections of DATS. Imports every `*_collection.py`
        module once, so that core never has to import the module collections."""
        global _collections_imported
        if not _collections_imported:
            import_by_suffix("_collection.py")
            _collections_imported = True
        return list(_collections)

    @classmethod
    def get_collection_name(cls) -> str:
        return f"{cls.name}{conf.weaviate.collection_postfix}"

    @classmethod
    def get_tenant_name(cls, project_id: int) -> str:
        return f"Project{project_id}"

    @classmethod
    def create_collection(cls, client: WeaviateClient):
        if not client.collections.exists(cls.get_collection_name()):
            client.collections.create(
                name=cls.get_collection_name(),
                description=cls.description,
                properties=list(cls.properties.values()),
                # All configurations below apply to all collections:
                vector_config=Configure.Vectors.self_provided(
                    vector_index_config=Configure.VectorIndex.hnsw(
                        distance_metric=VectorDistances.COSINE
                    ),
                ),
                # Enable multi-tenancy: one project = one tenant
                multi_tenancy_config=Configure.multi_tenancy(
                    enabled=True, auto_tenant_creation=True
                ),
            )
            logger.info(
                f"Created collection '{cls.get_collection_name()}' with properties: {', '.join(cls.properties.keys())}"
            )

    @classmethod
    def create_tenant(cls, client: WeaviateClient, project_id: int):
        tenant_name = cls.get_tenant_name(project_id)

        # 1) Check that collection exists
        if not client.collections.exists(cls.get_collection_name()):
            raise ValueError(
                f"Collection '{cls.get_collection_name()}' does not exist. Cannot create tenant for project_id '{project_id}'."
            )

        # 2) Create tenant for project_id if not exists
        collection = client.collections.get(cls.get_collection_name())
        if not collection.tenants.exists(tenant_name):
            collection.tenants.create(tenant_name)
            logger.info(
                f"Created tenant for project_id '{project_id}' in collection '{cls.get_collection_name()}'"
            )

    @classmethod
    def delete_tenant(cls, client: WeaviateClient, project_id: int):
        """Removes the tenant of project_id and with it all of its objects."""
        client.collections.get(cls.get_collection_name()).tenants.remove(
            [cls.get_tenant_name(project_id)]
        )
