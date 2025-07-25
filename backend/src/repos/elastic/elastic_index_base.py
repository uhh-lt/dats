from typing import Any, Dict, Optional

from elasticsearch import Elasticsearch


class IndexBase:
    name: str
    description: str
    mappings: Dict[str, Any]
    settings: Optional[Dict[str, Any]] = None

    @classmethod
    def get_index_name(cls, proj_id: int) -> str:
        return f"dats_project_{proj_id}_{cls.name}"

    @classmethod
    def create_index(
        cls,
        client: Elasticsearch,
        proj_id: int,
        replace_if_exists: bool = False,
    ):
        index_name = cls.get_index_name(proj_id)
        if replace_if_exists and client.indices.exists(index=index_name):
            client.indices.delete(index=index_name)
        if not client.indices.exists(index=index_name):
            client.indices.create(
                index=index_name, mappings=cls.mappings, settings=cls.settings
            )

    @classmethod
    def delete_index(cls, client: Elasticsearch, proj_id: int):
        index_name = cls.get_index_name(proj_id)
        if client.indices.exists(index=index_name):
            client.indices.delete(index=index_name)
