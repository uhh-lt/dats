from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from app.core.vector.collections.base_collection import BaseCollection
from app.core.vector.dto.object_identifier import ObjectIdentifier
from app.core.vector.dto.search_results import EmbeddingSearchResult, SimSearchResult
from app.core.vector.weaviate_exceptions import (
    WeaviateBatchImportError,
    WeaviateObjectIDNotFoundException,
    WeaviateObjectIDsNotFoundException,
    WeaviateObjectUUIDNotFoundException,
)
from loguru import logger
from weaviate import WeaviateClient
from weaviate.classes.query import Filter, MetadataQuery
from weaviate.collections.classes.filters import _Filters
from weaviate.types import UUID

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
        client: WeaviateClient,
        collection_class: Type[COLLECTION],
        object_identifier: Type[ID],
    ):
        """Initialize with collection class"""
        self.object_identifier = object_identifier
        self.client = client
        self.collection_class = collection_class
        self.collection_name = collection_class.name

    def _get_collection(self, project_id: int):
        """Get the collection from weaviate client"""
        return self.client.collections.get(self.collection_name).with_tenant(
            f"Project{project_id}"
        )

    def _validate_properties(
        self, properties: Dict[str, Any], must_identify_object: bool
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

    def _convert_identifier_to_properties(self, identifier: ID) -> Dict[str, Any]:
        """Convert an identifier to a properties dictionary"""
        return identifier.model_dump()

    def _build_filter_from_properties(self, properties: Dict[str, Any]) -> _Filters:
        """
        Build a filter from the properties dictionary
        Args:
            properties: Dictionary of properties to build the filter from
        Returns:
            Filter object or None if no properties are provided
        Raises:
            ValueError: If properties are empty
        """
        if not properties or len(properties) == 0:
            raise ValueError("Properties cannot be empty")

        filter_query: Optional[_Filters] = None
        for key, value in properties.items():
            if filter_query is None:
                filter_query = Filter.by_property(key).equal(value)
            else:
                filter_query = filter_query & Filter.by_property(key).equal(value)

        assert filter_query is not None, "Filter query should not be None"
        return filter_query

    def add_embedding(self, project_id: int, id: ID, embedding: List[float]) -> UUID:
        """
        Add a single embedding to Weaviate
        Args:
            id: Object identifier
            embedding: Vector embedding
        Returns:
            UUID of the created object
        """
        collection = self._get_collection(project_id=project_id)

        # Convert identifier to properties
        properties = self._convert_identifier_to_properties(id)
        self._validate_properties(properties, must_identify_object=True)

        # Create the object with properties and vector
        obj_uuid = collection.data.insert(properties, vector=embedding)

        return obj_uuid

    def add_embedding_batch(
        self, project_id: int, ids: List[ID], embeddings: List[List[float]]
    ) -> List[UUID]:
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

        collection = self._get_collection(project_id=project_id)

        # Check if lists have the same length
        if len(ids) != len(embeddings):
            raise ValueError("Length of ids and embeddings must be the same")

        # Prepare batch objects
        uuids: List[UUID] = []
        with collection.batch.dynamic() as batch:
            for id, embedding in zip(ids, embeddings):
                # Convert id to properties
                properties = self._convert_identifier_to_properties(id)

                # Validate that properties can exactly identify the object
                self._validate_properties(properties, must_identify_object=True)

                obj_uuid = batch.add_object(properties=properties, vector=embedding)
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

    def remove_embedding(self, project_id: int, id: ID) -> UUID:
        """
        Remove an embedding from Weaviate
        Args:
            id: Object identifier
        """
        collection = self._get_collection(project_id=project_id)

        # Convert identifier to properties
        properties = self._convert_identifier_to_properties(id)

        # Validate that properties can exactly identify the object
        self._validate_properties(properties, must_identify_object=True)

        # Build filter from identifier properties
        filter_query = self._build_filter_from_properties(properties)

        # Query to find the object
        result = collection.query.fetch_objects(
            filters=filter_query,
            limit=1,
        )

        if len(result.objects) == 0:
            raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        # Delete if found
        uuid = result.objects[0].uuid
        collection.data.delete_by_id(uuid)
        return uuid

    def remove_embeddings_by_project(self, project_id: int) -> None:
        """
        Remove all embeddings for a project.
        Internally, this completely removes the tenant from Weaviate.
        Args:
            project_id: Project ID
        """
        self.client.collections.get(self.collection_name).tenants.remove(
            [f"Project{project_id}"]
        )

    def get_uuid(self, project_id: int, id: ID) -> UUID:
        """
        Get the UUID of an object from Weaviate
        Args:
            id: Object identifier
        Returns:
            UUID of the object or None if not found
        """
        collection = self._get_collection(project_id=project_id)

        # Convert identifier to properties
        properties = self._convert_identifier_to_properties(id)

        # Validate that properties can exactly identify the object
        self._validate_properties(properties, must_identify_object=True)

        # Build filter from identifier properties
        filter_query = self._build_filter_from_properties(properties)

        # Query to find the object
        result = collection.query.fetch_objects(
            filters=filter_query,
            limit=1,
        )

        if len(result.objects) == 0:
            raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        return result.objects[0].uuid

    def get_uuids(self, project_id: int, ids: List[ID]) -> List[UUID]:
        """
        Get the UUIDs of multiple objects from Weaviate
        Args:
            ids: List of object identifiers
        Returns:
            List of UUIDs of the objects
        Raises:
            WeaviateObjectIDsNotFoundException: If not all IDs are found
            WeaviateObjectIDNotFoundException: If an ID is not found
        """

        if not ids:
            return []

        collection = self._get_collection(project_id=project_id)

        # Convert identifiers to properties
        properties_list = [self._convert_identifier_to_properties(id) for id in ids]

        # Validate that properties can exactly identify the objects
        for properties in properties_list:
            self._validate_properties(properties, must_identify_object=True)

        # Create a mapping to maintain the original order
        found_uuids: Dict[str, UUID] = {}

        # Process in batches of 100
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            batch_properties = properties_list[i : i + batch_size]

            # Build an OR filter from all identifiers in this batch
            filter_query: Optional[_Filters] = None
            for properties in batch_properties:
                obj_filter = self._build_filter_from_properties(properties)
                if filter_query is None:
                    filter_query = obj_filter
                else:
                    filter_query = filter_query | obj_filter

            # Query to find the objects
            result = collection.query.fetch_objects(
                filters=filter_query,
                limit=len(batch_properties),
                return_properties=True,
            )

            # Map each result to its ID
            for obj in result.objects:
                obj_id = self.object_identifier.model_validate(obj.properties)
                found_uuids[str(obj_id)] = obj.uuid

        # Check if all objects were found
        if len(found_uuids) < len(ids):
            raise WeaviateObjectIDsNotFoundException(
                num_requested_ids=len(ids),
                num_found_ids=len(found_uuids),
                collection=collection,
            )

        # Return UUIDs in the same order as the input ids
        uuids = []
        for id in ids:
            try:
                uuids.append(found_uuids[str(id)])
            except KeyError:
                raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        return uuids

    def get_embedding(self, project_id: int, id: ID) -> List[float]:
        """
        Get an embedding from Weaviate
        Args:
            id: Object identifier
        Returns:
            Object with embedding or None if not found
        """
        collection = self._get_collection(project_id=project_id)

        # Convert identifier to properties
        properties = self._convert_identifier_to_properties(id)

        # Validate that properties can exactly identify the object
        self._validate_properties(properties, must_identify_object=True)

        # Build filter from identifier properties
        filter_query = self._build_filter_from_properties(properties)

        # Query to find the object with vector
        result = collection.query.fetch_objects(
            filters=filter_query, include_vector=True, limit=1
        )

        if not result.objects:
            raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        embedding = result.objects[0].vector["vector"]
        assert isinstance(
            embedding, list
        ), f"Expected embedding to be a list, got {type(embedding)}"
        assert isinstance(
            embedding[0], float
        ), "Expected all elements of embedding to be float"
        return embedding  # type: ignore

    def get_embeddings(self, project_id: int, ids: List[ID]) -> List[List[float]]:
        """
        Get multiple embeddings from Weaviate
        Args:
            ids: List of object identifiers
        Returns:
            List of embeddings
        """
        collection = self._get_collection(project_id=project_id)

        # Convert identifiers to properties
        properties_list = [self._convert_identifier_to_properties(id) for id in ids]

        # Validate that properties can exactly identify the objects
        for properties in properties_list:
            self._validate_properties(properties, must_identify_object=True)

        # Create a mapping to maintain the original order
        found_embeddings: Dict[str, List[float]] = {}

        # Process in batches of 100
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            batch_properties = properties_list[i : i + batch_size]

            # Build an OR filter from all identifiers in this batch
            filter_query: Optional[_Filters] = None
            for properties in batch_properties:
                obj_filter = self._build_filter_from_properties(properties)
                if filter_query is None:
                    filter_query = obj_filter
                else:
                    filter_query = filter_query | obj_filter

            # Query to find the objects with vector
            result = collection.query.fetch_objects(
                filters=filter_query,
                include_vector=True,
                limit=len(batch_properties),
            )

            # Map each result to its ID and embedding
            for obj in result.objects:
                obj_id = self.object_identifier.model_validate(obj.properties)
                vector = obj.vector["vector"]
                assert isinstance(
                    vector, list
                ), f"Expected embedding to be a list, got {type(vector)}"
                assert isinstance(
                    vector[0], float
                ), "Expected all elements of embedding to be float"
                found_embeddings[str(obj_id)] = vector  # type: ignore

        # Check if all objects were found
        if len(found_embeddings) < len(ids):
            raise WeaviateObjectIDsNotFoundException(
                num_requested_ids=len(ids),
                num_found_ids=len(found_embeddings),
                collection=collection,
            )

        # Return embeddings in the same order as the input ids
        embeddings = []
        for id in ids:
            try:
                embeddings.append(found_embeddings[str(id)])
            except KeyError:
                raise WeaviateObjectIDNotFoundException(id=id, collection=collection)

        return embeddings

    def get_embedding_by_uuid(self, project_id: int, uuid: str) -> List[float]:
        """
        Get an embedding from Weaviate using its UUID
        Args:
            uuid: UUID of the object
        Returns:
            Object with embedding or None if not found
        """
        collection = self._get_collection(project_id=project_id)

        # Query to find the object with vector
        data_obj = collection.query.fetch_object_by_id(
            uuid=uuid,
            include_vector=True,
        )

        return data_obj.vector["vector"]  # type: ignore

    def get_embeddings_by_uuids(
        self, project_id: int, uuids: List[str]
    ) -> List[List[float]]:
        """
        Get multiple embeddings from Weaviate using their UUIDs
        Args:
            uuids: List of UUIDs of the objects
        Returns:
            List of embeddings
        """
        collection = self._get_collection(project_id=project_id)

        # Query to find the objects with vector
        result = collection.query.fetch_objects_by_ids(
            ids=uuids,
            include_vector=True,
        )
        for obj, uuid in zip(result.objects, uuids):
            assert obj.uuid == uuid, "UUIDs do not match"
        return [obj.vector["vector"] for obj in result.objects]  # type: ignore

    def find_embeddings_by_filters(
        self, project_id: int, filters: _Filters
    ) -> List[EmbeddingSearchResult[ID]]:
        """
        Get embeddings from Weaviate based on filters
        Args:
            project_id: ID of the project
            filters: Weaviate filters to apply
        Returns:
            List of embeddings
        """
        collection = self._get_collection(project_id=project_id)

        # Query to find the objects with vector
        result = collection.query.fetch_objects(
            filters=filters,
            include_vector=True,
        )

        # TODO: How can I circumvent the limit?

        # Map each result to its ID and embedding
        embeddings: List[EmbeddingSearchResult[ID]] = []
        for obj in result.objects:
            obj_id = self.object_identifier.model_validate(obj.properties)
            vector = obj.vector["vector"]
            assert isinstance(
                vector, list
            ), f"Expected embedding to be a list, got {type(vector)}"
            assert isinstance(
                vector[0], float
            ), "Expected all elements of embedding to be float"
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
        project_id,
        uuid: UUID,
        k: int,
        threshold: float,
        filters: Optional[_Filters] = None,
    ) -> List[SimSearchResult[ID]]:
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
        collection = self._get_collection(project_id=project_id)

        # Validate that object exists
        if not collection.data.exists(uuid):
            raise WeaviateObjectUUIDNotFoundException(uuid=uuid, collection=collection)

        query_result = collection.query.near_object(
            near_object=uuid,
            filters=filters,
            limit=k,
            certainty=threshold,
            return_metadata=MetadataQuery(distance=True),
            return_properties=True,
        )

        return [
            SimSearchResult[ID](
                uuid=obj.uuid,
                id=self.object_identifier.model_validate(obj.properties),
                score=obj.metadata.distance or 0.0,
            )
            for obj in query_result.objects
        ]

    def search_near_vector(
        self,
        project_id: int,
        vector: List[float],
        k: int,
        threshold: Optional[float] = None,
        filters: Optional[_Filters] = None,
    ) -> List[SimSearchResult[ID]]:
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
        collection = self._get_collection(project_id=project_id)

        query_result = collection.query.near_vector(
            near_vector=vector,
            filters=filters,
            limit=k,
            certainty=threshold,
            return_metadata=MetadataQuery(distance=True),
            return_properties=True,
        )

        return [
            SimSearchResult[ID](
                uuid=obj.uuid,
                id=self.object_identifier.model_validate(obj.properties),
                score=obj.metadata.distance or 0.0,
            )
            for obj in query_result.objects
        ]
