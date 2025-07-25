from repos.elastic.elastic_index_base import IndexBase


class MemoIndex(IndexBase):
    name = "memos"
    description = "Memo index for project memos"
    mappings = {
        "properties": {
            "title": {
                "type": "search_as_you_type",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "content": {"type": "text"},
            "starred": {"type": "boolean"},
            "project_id": {"type": "long"},
            "memo_id": {"type": "long"},
            "user_id": {"type": "long"},
            "attached_object_id": {"type": "long"},
            "attached_object_type": {"type": "keyword"},
            "created": {"type": "date"},
            "updated": {"type": "date"},
        }
    }
    settings = {"index": {"number_of_shards": 1, "number_of_replicas": 0}}
