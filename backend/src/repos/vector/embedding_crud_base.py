from typing import Any, Generic, Type, TypeVar

from loguru import logger
from weaviate import WeaviateClient
from weaviate.classes.query import MetadataQuery
from weaviate.collections.classes.filters import _Filters
from weaviate.types import UUID

from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_exceptions import (
    WeaviateBatchImportError,
    WeaviateObjectIDNotFoundException,
    WeaviateObjectUUIDNotFoundException,
)
from repos.vector.weaviate_models import (
    EmbeddingSearchResult,
    ObjectIdentifier,
    SimSearchResult,
)

ID = TypeVar("ID", bound=ObjectIdentifier)
COLLECTION = TypeVar("COLLECTION", bound=BaseCollection)


class CRUDBase(Generic[ID, COLLECTION]):
    """
    Base class for CRUD operations with Weaviate vector database

    Generic type T is the type of the object identifier, which must
    be a subclass of ObjectIdentifier
    """

    def __init__(
        self,
        collection_class: Type[COLLECTION],
        object_identifier: Type[ID],
    ):
        """Initialize with collection class"""
        self.object_identifier = object_identifier
        self.collection_class = collection_class
        self.collection_name = collection_class.name

    def _get_collection(self, client: WeaviateClient, project_id: int):
        """Get the collection from weaviate client"""
        return client.collections.get(self.collection_name).with_tenant(
            f"Project{project_id}"
        )

    def _tenant_exists(self, client: WeaviateClient, project_id: int) -> bool:
        """
        Check if the tenant for the given project ID exists in Weaviate
        Args:
            client: Weaviate client
            project_id: Project ID
        Returns:
            True if tenant exists, False otherwise
        """
        collection = client.collections.get(self.collection_name)
        tenant = f"Project{project_id}"
        return collection.tenants.exists(tenant)

    def _validate_properties(
        self, properties: dict[str, Any], must_identify_object: bool
    ) -> None:
        """
        Validate the properties dictionary: Properties must have the correct keys and types as defined in the collection
        Args:
            properties: Dictionary of properties to validate
            must_identify_object: If True, the number of properties must match the collection's properties, exactly identifying one object
        Raises:
            ValueError: If properties do not match the collection's properties
        """

        valid_key_datatype = {
            p.name: p.dataType for p in self.collection_class.properties.values()
        }

        if must_identify_object:
            if not len(properties) == len(valid_key_datatype):
                raise ValueError(
                    f"Invalid number of properties: expected {len(valid_key_datatype)}, got {len(properties)}"
                )

        for key, value in properties.items():
            if key not in valid_key_datatype.keys():
                raise ValueError(f"Invalid property '{key}' in properties")

            expected_type = valid_key_datatype[key]
            if not isinstance(value, eval(expected_type.value)):
                raise ValueError(
                    f"Property '{key}' must be of type '{expected_type}', got '{type(value)}'"
                )

    def add_embedding(
        self, client: WeaviateClient, project_id: int, id: ID, embedding: list[float]
    ) -> None:
        """
        Add a single embedding to Weaviate
        Args:
            id: Object identifier
            embedding: Vector embedding
        """
        collection = self._get_collection(client=client, project_id=project_id)
        collection.data.insert(
            uuid=id.uuidv5(),
            properties=id.model_dump(),
            references=None,
            vector=embedding,
        )

    def add_embedding_batch(
        self,
        client: WeaviateClient,
        project_id: int,
        ids: list[ID],
        embeddings: list[list[float]],
    ) -> list[UUID]:
        """
        Add multiple embeddings to Weaviate in a batch
        Args:
            ids: List of object identifiers
            embeddings: List of vector embeddings
        Returns:
            List of UUIDs of the created objects
        Raises:
            ValueError: If the lengths of ids and embeddings do not match
            WeaviateVectorLengthError: If the embedding dimensions do not match the collection's dimensions
        """

        collection = self._get_collection(client=client, project_id=project_id)

        # Check if lists have the same length
        if len(ids) != len(embeddings):
            raise ValueError("Length of ids and embeddings must be the same")

        # Prepare batch objects
        uuids: list[UUID] = []
        with collection.batch.dynamic() as batch:
            for id, embedding in zip(ids, embeddings):
                obj_uuid = batch.add_object(
                    uuid=id.uuidv5(), properties=id.model_dump(), vector=embedding
                )
                uuids.append(obj_uuid)
                if batch.number_errors > 0:
                    logger.error("Batch import stopped because an error occurred!")
                    break

        failed_objects = collection.batch.failed_objects
        if failed_objects:
            logger.error(f"Number of failed imports: {len(failed_objects)}")
            logger.error(f"First failed object: {failed_objects[0]}")
            raise WeaviateBatchImportError()

        return uuids

    def remove_embedding(self, client: WeaviateClient, project_id: int, id: ID) -> bool:
        """
        Remove an embedding from Weaviate
        Args:
            id: Object identifier
        """
        collection = self._get_collection(client=client, project_id=project_id)
        return collection.data.delete_by_id(id.uuidv5())

    def remove_embeddings_by_project(
        self, client: WeaviateClient, project_id: int
    ) -> None:
        """
        Remove all embeddings for a project.
        Internally, this completely removes the tenant from Weaviate.
        Args:
            project_id: Project ID
        """
        client.collections.get(self.collection_name).tenants.remove(
            [f"Project{project_id}"]
        )

    def get_embedding(
        self, client: WeaviateClient, project_id: int, id: ID
    ) -> list[float]:
        """
        Get an embedding from Weaviate
        Args:
            id: Object identifier
        Returns:
            Object with embedding or None if not found
        """
        collection = self._get_collection(client=client, project_id=project_id)
        obj = collection.query.fetch_object_by_id(id.uuidv5(), include_vector=True)
        if not obj:
            raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        return obj.vector["default"]  # type: ignore

    def get_embeddings(
        self, client: WeaviateClient, project_id: int, ids: list[ID]
    ) -> list[list[float]]:
        """
        Get multiple embeddings from Weaviate
        Args:
            ids: List of object identifiers
        Returns:
            List of embeddings
        """
        uuid_list = [id.uuidv5() for id in ids]
        collection = self._get_collection(client=client, project_id=project_id)
        objs = collection.query.fetch_objects_by_ids(
            ids=uuid_list,
            include_vector=True,
            limit=len(ids),
        )
        uuid2vector: dict[str, list[float]] = {
            str(obj.uuid): obj.vector["default"]  # type: ignore
            for obj in objs.objects
        }

        # Return embeddings in the same order as the input ids
        result = []
        for id, uuid in zip(ids, uuid_list):
            try:
                result.append(uuid2vector[uuid])
            except KeyError:
                raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        return result

    def find_embeddings_by_filters(
        self, client: WeaviateClient, project_id: int, filters: _Filters
    ) -> list[EmbeddingSearchResult[ID]]:
        """
        Get embeddings from Weaviate based on filters
        Args:
            project_id: ID of the project
            filters: Weaviate filters to apply
        Returns:
            List of embeddings
        """
        collection = self._get_collection(client=client, project_id=project_id)

        # Query to find the objects with vector
        result = collection.query.fetch_objects(
            filters=filters,
            include_vector=True,
        )

        # TODO: How can I circumvent the limit?

        # Map each result to its ID and embedding
        embeddings: list[EmbeddingSearchResult[ID]] = []
        for obj in result.objects:
            obj_id = self.object_identifier.model_validate(obj.properties)
            vector = obj.vector["default"]
            assert isinstance(vector, list), (
                f"Expected embedding to be a list, got {type(vector)}"
            )
            assert isinstance(vector[0], float), (
                "Expected all elements of embedding to be float"
            )
            embeddings.append(
                EmbeddingSearchResult[ID](
                    uuid=obj.uuid,
                    id=obj_id,
                    embedding=vector,  # type: ignore
                )
            )

        return embeddings

    def search_near_object(
        self,
        client: WeaviateClient,
        project_id,
        id: ID,
        k: int,
        threshold: float,
        filters: _Filters | None = None,
    ) -> list[SimSearchResult[ID]]:
        """
        Finds up-to k objects near (cosine-similarity) the given object in Weaviate using its UUID
        Args:
            uuid: UUID of the object
            k: Number of similar objects to find
            threshold: Minimum similarity score to consider an object as similar
            filters: Optional filters to apply
        Returns:
            List of objects found
        """
        collection = self._get_collection(client=client, project_id=project_id)
        uuid = id.uuidv5()

        # Validate that object exists
        if not collection.data.exists(uuid):
            raise WeaviateObjectUUIDNotFoundException(uuid=uuid, collection=collection)

        query_result = collection.query.near_object(
            near_object=uuid,
            filters=filters,
            limit=k,
            certainty=threshold,
            return_metadata=MetadataQuery(certainty=True),
            return_properties=True,
        )

        return [
            SimSearchResult[ID](
                uuid=obj.uuid,
                id=self.object_identifier.model_validate(obj.properties),
                score=obj.metadata.certainty or 0.0,
            )
            for obj in query_result.objects
        ]

    def search_near_vector(
        self,
        client: WeaviateClient,
        project_id: int,
        vector: list[float],
        k: int,
        threshold: float | None = None,
        filters: _Filters | None = None,
    ) -> list[SimSearchResult[ID]]:
        """
        Finds up-to k objects near (cosine-similarity) the given vector in Weaviate
        Args:
            vector: Vector to search for
            k: Number of similar objects to find
            threshold: Minimum similarity score to consider an object as similar
            filters: Optional filters to apply
        Returns:
            List of objects found
        """
        collection = self._get_collection(client=client, project_id=project_id)

        query_result = collection.query.near_vector(
            near_vector=vector,
            filters=filters,
            limit=k,
            certainty=threshold,
            return_metadata=MetadataQuery(certainty=True),
            return_properties=True,
        )

        return [
            SimSearchResult[ID](
                uuid=obj.uuid,
                id=self.object_identifier.model_validate(obj.properties),
                score=obj.metadata.certainty or 0.0,
            )
            for obj in query_result.objects
        ]
