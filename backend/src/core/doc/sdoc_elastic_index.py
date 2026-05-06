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


# class SdocIndex(IndexBase):
#     name = "docs"
#     description = "SDoc index for project documents"
#     settings = {
#         "index": {"number_of_shards": 1, "number_of_replicas": 0},
#         "analysis": {
#             "normalizer": {
#                 "shingle_normalizer": {
#                     "type": "custom",
#                     # "tokenizer": "standard",
#                     "filter": ["lowercase", "shingle"],
#                 }
#             },
#             "filter": {
#                 "my_shingle_filter": {
#                     "type": "shingle",
#                     "min_shingle_size": 2,
#                     "max_shingle_size": 2,
#                     "output_unigrams": False,
#                 }
#             },
#         },
#     }

#     mappings = {
#         "properties": {
#             "filename": {"type": "keyword"},
#             "content": {
#                 "type": "text",
#                 "term_vector": "with_positions_offsets",
#                 "fields": {
#                     # "keyword": {"type": "keyword"},  # change
#                     "shingles": {
#                         "type": "keyword",  # change
#                         "normalizer": "shingle_analyzer",
#                         # "fielddata": True,
#                     },
#                 },
#             },
#             "sdoc_id": {"type": "long"},
#             "project_id": {"type": "long"},
#             "created": {"type": "date"},
#         }
#     }


# class SdocIndex(IndexBase):
#     name = "docs"
#     description = "SDoc index for project documents"
#     mappings = {
#         "properties": {
#             "filename": {"type": "keyword"},
#             "content": {
#                 "type": "text",
#                 "term_vector": "with_positions_offsets",
#                 "analyzer": "bigram_analyzer",
#                 "fields": {"keyword": {"type": "keyword"}},
#             },
#             "sdoc_id": {"type": "long"},
#             "project_id": {"type": "long"},
#             "created": {"type": "date"},
#         }
#     }
#     settings = {
#         "index": {"number_of_shards": 1, "number_of_replicas": 0},
#         "analysis": {
#             "analyzer": {
#                 "bigram_analyzer": {
#                     "type": "custom",
#                     "tokenizer": "standard",
#                     "filter": ["lowercase", "bigram_filter"],
#                 }
#             },
#             "filter": {
#                 "bigram_filter": {
#                     "type": "shingle",
#                     "min_shingle_size": 2,
#                     "max_shingle_size": 2,
#                     "output_unigrams": False,
#                 }
#             },
#         },
#     }


# class SdocIndex(IndexBase):
#     name = "docs"
#     description = "SDoc index for project documents with dynamic n-grams"
#     mappings = {
#         "properties": {
#             "filename": {"type": "keyword"},
#             "content": {
#                 "type": "text",
#                 "term_vector": "with_positions_offsets",
#             },
#             "content_unigram": {
#                 "type": "text",
#                 "analyzer": "standard",
#                 "fields": {"keyword": {"type": "keyword"}},
#             },
#             "content_bigram": {
#                 "type": "text",
#                 "analyzer": "bigram_analyzer",
#                 "fields": {"keyword": {"type": "keyword"}},
#             },
#             "content_trigram": {
#                 "type": "text",
#                 "analyzer": "trigram_analyzer",
#                 "fields": {"keyword": {"type": "keyword"}},
#             },
#             "sdoc_id": {"type": "long"},
#             "project_id": {"type": "long"},
#             "created": {"type": "date"},
#         }
#     }

#     settings = {
#         "analysis": {
#             "analyzer": {
#                 "bigram_analyzer": {
#                     "tokenizer": "standard",
#                     "filter": ["lowercase", "bigram_shingle"],
#                 },
#                 "trigram_analyzer": {
#                     "tokenizer": "standard",
#                     "filter": ["lowercase", "trigram_shingle"],
#                 },
#             },
#             "filter": {
#                 "bigram_shingle": {
#                     "type": "shingle",
#                     "min_shingle_size": 2,
#                     "max_shingle_size": 2,
#                     "output_unigrams": False,
#                 },
#                 "trigram_shingle": {
#                     "type": "shingle",
#                     "min_shingle_size": 3,
#                     "max_shingle_size": 3,
#                     "output_unigrams": False,
#                 },
#             },
#         },
#         "index": {"number_of_shards": 1, "number_of_replicas": 0},
#     }
