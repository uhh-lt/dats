from repos.elastic.elastic_index_base import IndexBase


# TODO: Replace with actual sdoc mappings/settings
class SdocIndex(IndexBase):
    name = "docs"
    description = "SDoc index for project documents"
    settings = {
        "index": {"number_of_shards": 1, "number_of_replicas": 0},
        "analysis": {
            "analyzer": {
                "unigram_analyzer": {
                    "tokenizer": "standard",
                    "filter": ["lowercase"],
                },
                "bigram_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "bigram_filter"],
                },
                "trigram_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "trigram_filter"],
                },
            },
            "filter": {
                "bigram_filter": {
                    "type": "shingle",
                    "min_shingle_size": 2,
                    "max_shingle_size": 2,
                    "output_unigrams": False,
                },
                "trigram_filter": {
                    "type": "shingle",
                    "min_shingle_size": 3,
                    "max_shingle_size": 3,
                    "output_unigrams": False,
                },
            },
        },
    }

    mappings = {
        "properties": {
            "filename": {"type": "keyword"},
            "content": {
                "type": "text",
                "term_vector": "with_positions_offsets",
                "fields": {
                    "unigrams": {
                        "type": "text",
                        "analyzer": "unigram_analyzer",
                        "fielddata": True,
                    },
                    "bigrams": {
                        "type": "text",
                        "analyzer": "bigram_analyzer",
                        "fielddata": True,
                    },
                    "trigrams": {
                        "type": "text",
                        "analyzer": "trigram_analyzer",
                        "fielddata": True,
                    },
                },
            },
            "sdoc_id": {"type": "long"},
            "project_id": {"type": "long"},
            "created": {"type": "date"},
        }
    }
