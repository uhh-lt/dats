from typing import Any, Generic, TypeVar

from elasticsearch import Elasticsearch, helpers
from pydantic import BaseModel

from repos.elastic.elastic_dto_base import (
    ElasticSearchHit,
    ElasticSearchModelBase,
    PaginatedElasticSearchHits,
)
from repos.elastic.elastic_exceptions import NoSuchObjectInElasticSearchError
from repos.elastic.elastic_index_base import IndexBase

ModelDTOType = TypeVar("ModelDTOType", bound=ElasticSearchModelBase)
CreateDTOType = TypeVar("CreateDTOType", bound=ElasticSearchModelBase)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)
IndexType = TypeVar("IndexType", bound=IndexBase)


class ElasticCRUDBase(Generic[IndexType, ModelDTOType, CreateDTOType, UpdateDTOType]):
    def __init__(self, index: type[IndexType], model: type[ModelDTOType]) -> None:
        """
        Generic CRUD access to the per-project Elasticsearch index of a model
        Args:
            index: The index the documents are stored in
            model: The DTO that documents are parsed into
        """
        self.index = index
        self.model = model

    ### CREATE OPERATIONS ###

    def create(
        self, client: Elasticsearch, *, project_id: int, create_dto: CreateDTOType
    ) -> int:
        """
        Index a new document
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is used
            create_dto: The document to index
        Returns:
            The ID of the indexed document
        """
        index_name = self.index.get_index_name(project_id=project_id)
        res = client.index(
            index=index_name,
            id=str(create_dto.get_id()),
            document=create_dto.model_dump(),
        )
        return int(res["_id"])

    ### READ OPERATIONS ###

    def read(self, client: Elasticsearch, *, project_id: int, id: int) -> ModelDTOType:
        """
        Read a document by its ID
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is used
            id: ID of the document
        Returns:
            The document
        Raises:
            NoSuchObjectInElasticSearchError: If the document does not exist
        """
        index_name = self.index.get_index_name(project_id=project_id)
        res = client.get(index=index_name, id=str(id), _source=True)
        if not res["found"]:
            raise NoSuchObjectInElasticSearchError(index_name=index_name, id=id)
        return self.model(**res["_source"])

    ### UPDATE OPERATIONS ###

    def update(
        self,
        client: Elasticsearch,
        *,
        project_id: int,
        id: int,
        update_dto: UpdateDTOType,
    ) -> ModelDTOType:
        """
        Update a document by its ID
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is used
            id: ID of the document
            update_dto: The fields to update
        Returns:
            The updated document
        Raises:
            NoSuchObjectInElasticSearchError: If the document does not exist
        """
        index_name = self.index.get_index_name(project_id=project_id)

        # Ensure the object exists before updating
        self.read(client=client, project_id=project_id, id=id)

        # TODO: Check what this returns
        client.update(
            index=index_name, id=str(id), body={"doc": update_dto.model_dump()}
        )
        return self.read(client=client, project_id=project_id, id=id)

    ### DELETE OPERATIONS ###

    def delete(self, client: Elasticsearch, *, project_id: int, id: int) -> None:
        """
        Delete a document by its ID
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is used
            id: ID of the document
        """
        index_name = self.index.get_index_name(project_id=project_id)
        client.delete(index=index_name, id=str(id))

    ### OTHER OPERATIONS ###

    def search(
        self,
        client: Elasticsearch,
        *,
        project_id: int,
        query: dict[str, Any],
        limit: int | None = None,
        skip: int | None = None,
        highlight: dict[str, Any] | None = None,
    ) -> PaginatedElasticSearchHits:
        """
        Helper function that can be reused to find documents with different queries.
        Args:
            client: Elasticsearch client
            project_id: ID of the project whose index is searched
            query: The ElasticSearch query object in ES Query DSL
            limit: The maximum number of returned elements
            skip: The number of skipped elements
            highlight: Optional ElasticSearch highlight configuration
        Returns:
            A (possibly empty) paginated list of hits matching the query
        Raises:
            ValueError: If the index does not exist or the parameters are invalid
        """
        index_name = self.index.get_index_name(project_id=project_id)
        if not client.indices.exists(index=index_name):
            raise ValueError(f"ElasticSearch Index '{index_name}' does not exist!")

        if query is None or len(query) < 1:
            raise ValueError("Query DSL object must not be None or empty!")

        if isinstance(limit, int) and (limit > 10000 or limit < 1):
            raise ValueError("Limit must be a positive Integer smaller than 10000!")
        elif isinstance(skip, int) and (skip > 10000):
            raise ValueError(
                "Skip must be a zero or positive Integer smaller than 10000!"
            )

        if limit is None or skip is None:
            # use scroll api
            res = list(
                helpers.scan(
                    index=index_name,
                    query={
                        "query": query,
                        "_source": False,
                        "highlight": highlight,
                    },
                    client=client,
                    scroll="10m",
                    size=10000,
                    preserve_order=True,
                )
            )

            hits = []
            for document in res:
                highlights = (
                    document["highlight"]["content"] if "highlight" in document else []
                )
                es_hit = ElasticSearchHit(
                    id=document["_id"],
                    score=document["_score"],
                    highlights=highlights,
                )
                hits.append(es_hit)
            total_results = len(hits)

        else:
            # use search_api
            client_response = client.search(
                index=index_name,
                query=query,
                size=limit,
                from_=skip,
                _source=False,
                highlight=highlight,
            )
            hits = []
            for hit in client_response["hits"]["hits"]:
                highlights = hit["highlight"]["content"] if "highlight" in hit else []
                document = ElasticSearchHit(
                    id=hit["_id"], score=hit["_score"], highlights=highlights
                )
                hits.append(document)
            total_results = client_response["hits"]["total"]["value"]

        return PaginatedElasticSearchHits(hits=hits, total_results=total_results)
