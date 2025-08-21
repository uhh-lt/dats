from repos.elastic.elastic_index_base import IndexBase


# TODO: Replace with actual sdoc mappings/settings
class SdocIndex(IndexBase):
    name = "docs"
    description = "SDoc index for project documents"
    mappings = {
        "properties": {
            "filename": {"type": "keyword"},
            "content": {"type": "text", "term_vector": "with_positions_offsets"},
            "sdoc_id": {"type": "long"},
            "project_id": {"type": "long"},
            "created": {"type": "date"},
        }
    }
    settings = {"index": {"number_of_shards": 1, "number_of_replicas": 0}}
