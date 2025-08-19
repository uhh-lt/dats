from typing import Any, Generic, TypeVar

from elasticsearch import Elasticsearch, helpers
from pydantic import BaseModel

from repos.elastic.elastic_dto_base import (
    ElasticSearchHit,
    ElasticSearchModelBase,
    PaginatedElasticSearchHits,
)
from repos.elastic.elastic_index_base import IndexBase

ModelDTOType = TypeVar("ModelDTOType", bound=ElasticSearchModelBase)
CreateDTOType = TypeVar("CreateDTOType", bound=ElasticSearchModelBase)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)
IndexType = TypeVar("IndexType", bound=IndexBase)


class NoSuchObjectInElasticSearchError(Exception):
    def __init__(self, index_name: str, id: int):
        super().__init__(
            (f"There exists no Object with ID={id} in Index {index_name} ")
        )


class ElasticCrudBase(Generic[IndexType, ModelDTOType, CreateDTOType, UpdateDTOType]):
    def __init__(self, index: type[IndexType], model: type[ModelDTOType]):
        self.index = index
        self.model = model

    def create(
        self, client: Elasticsearch, create_dto: CreateDTOType, proj_id: int
    ) -> int:
        index_name = self.index.get_index_name(proj_id)
        res = client.index(
            index=index_name,
            id=str(create_dto.get_id()),
            document=create_dto.model_dump(),
        )
        return int(res["_id"])

    def read(self, client: Elasticsearch, id: int, proj_id: int) -> ModelDTOType:
        index_name = self.index.get_index_name(proj_id)
        res = client.get(index=index_name, id=str(id), _source=True)
        if not res["found"]:
            raise NoSuchObjectInElasticSearchError(index_name=index_name, id=id)
        return self.model(**res["_source"])

    def update(
        self, client: Elasticsearch, id: int, update_dto: UpdateDTOType, proj_id: int
    ) -> ModelDTOType:
        index_name = self.index.get_index_name(proj_id)

        # Ensure the object exists before updating
        self.read(client, id, proj_id)

        # TODO: Check what this returns
        client.update(
            index=index_name, id=str(id), body={"doc": update_dto.model_dump()}
        )
        return self.read(client, id, proj_id)

    def delete(self, client: Elasticsearch, id: int, proj_id: int) -> None:
        index_name = self.index.get_index_name(proj_id)
        client.delete(index=index_name, id=str(id))

    def search(
        self,
        client: Elasticsearch,
        proj_id: int,
        query: dict[str, Any],
        limit: int | None = None,
        skip: int | None = None,
        highlight: dict[str, Any] | None = None,
    ) -> PaginatedElasticSearchHits:
        """
        Helper function that can be reused to find SDocs or Memos with different queries.
        :param query: The ElasticSearch query object in ES Query DSL
        :param skip: The number of skipped elements
        :param limit: The maximum number of returned elements
        :return: A (possibly empty) list of Memo matching the query
        :rtype: PaginatedElasticSearchHits
        """
        index_name = self.index.get_index_name(proj_id)
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
