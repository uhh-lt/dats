from weaviate.collections import Collection
from weaviate.types import UUID

from repos.vector.weaviate_models import ObjectIdentifier


class WeaviateClientError(RuntimeError):
    pass


class WeaviateVectorLengthException(Exception):
    def __init__(self):
        super().__init__(
            "New embedding vector lengths are different from already indexed vectors!"
        )


class WeaviateBatchImportError(WeaviateClientError):
    def __init__(self):
        super().__init__("Batch import failed.")


class WeaviateObjectIDNotFoundException(Exception):
    def __init__(self, id: ObjectIdentifier, collection: Collection):
        super().__init__(
            f"Object with ID {id} not found in Weaviate Collection {collection.name}."
        )


class WeaviateObjectIDsNotFoundException(Exception):
    def __init__(
        self, num_requested_ids: int, num_found_ids: int, collection: Collection
    ):
        super().__init__(
            f"Requested {num_requested_ids} IDs, but found {num_found_ids} in Weaviate Collection {collection.name}."
        )


class WeaviateObjectUUIDNotFoundException(Exception):
    def __init__(self, uuid: UUID, collection: Collection):
        super().__init__(
            f"Object with UUID {uuid} not found in Weaviate Collection {collection.name}."
        )
