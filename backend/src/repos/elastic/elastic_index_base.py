from typing import Any

from elasticsearch import Elasticsearch, RequestError

from config import conf


class IndexBase:
    name: str
    description: str
    mappings: dict[str, Any]
    settings: dict[str, Any] | None = None

    @classmethod
    def get_index_name(cls, project_id: int) -> str:
        return f"{conf.elasticsearch.index_prefix}_project_{project_id}_{cls.name}"

    @classmethod
    def create_index(
        cls,
        client: Elasticsearch,
        *,
        project_id: int,
        replace_if_exists: bool = False,
    ) -> None:
        index_name = cls.get_index_name(project_id=project_id)
        if replace_if_exists and client.indices.exists(index=index_name):
            client.indices.delete(index=index_name)
        if client.indices.exists(index=index_name):
            return
        try:
            client.indices.create(
                index=index_name, mappings=cls.mappings, settings=cls.settings
            )
        except RequestError as e:
            # The client retries a create that timed out (`retry_on_timeout`),
            # and the retry finds the index that the first attempt created
            if e.error != "resource_already_exists_exception":
                raise

    @classmethod
    def delete_index(cls, client: Elasticsearch, *, project_id: int) -> None:
        index_name = cls.get_index_name(project_id=project_id)
        if client.indices.exists(index=index_name):
            client.indices.delete(index=index_name)
