import time
from typing import List

import networkx as nx
import numpy as np
import srsly
from loguru import logger
from scipy import sparse
from sklearn.metrics.pairwise import manhattan_distances

from app.core.data.doc_type import DocType
from app.core.data.dto.word_frequency import WordFrequencyRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class DuplicateFinderService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        return super(DuplicateFinderService, cls).__new__(cls)

    def find_duplicate_text_sdocs(
        self, project_id: int, max_different_words: int
    ) -> List[List[int]]:
        logger.info("Finding duplicate text sdocs")
        t0 = time.time()
        with self.sqls.db_session() as db:
            result = (
                db.query(
                    SourceDocumentDataORM.id, SourceDocumentDataORM.word_frequencies
                )
                .join(
                    SourceDocumentORM, SourceDocumentORM.id == SourceDocumentDataORM.id
                )
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    SourceDocumentORM.doctype == DocType.text,
                )
                .all()
            )
        t1 = time.time()
        logger.info(f"query took: {t1 - t0}")

        t0 = time.time()
        result = [
            WordFrequencyRead(sdoc_id=int(row[0]), **wf)
            for row in result
            for wf in srsly.json_loads(row[1])
        ]
        t1 = time.time()
        logger.info(f"convert took: {t1 - t0}")

        t0 = time.time()
        # unique words in project
        words = set([r.word.lower() for r in result])
        word2idx = {w: i for i, w in enumerate(words)}
        vocab_size = len(words)

        # process result to map
        sdoc_id2word_id2word_freq = {}
        for wf in result:
            word_id2_word_freq = sdoc_id2word_id2word_freq.get(wf.sdoc_id, {})
            word_id2_word_freq[word2idx[wf.word.lower()]] = wf.count
            sdoc_id2word_id2word_freq[wf.sdoc_id] = word_id2_word_freq

        # X.create document vectors
        idx2sdoc_id = {}
        values = []
        indices = []
        index = []
        for idx, sdoc_id in enumerate(sdoc_id2word_id2word_freq.keys()):
            word_id2_word_freq = sdoc_id2word_id2word_freq[sdoc_id]

            indices.extend(word_id2_word_freq.keys())
            values.extend(word_id2_word_freq.values())
            index.extend([idx] * len(word_id2_word_freq))

            idx2sdoc_id[idx] = sdoc_id

        document_vectors = sparse.csc_matrix(
            (values, (index, indices)), shape=(len(idx2sdoc_id), vocab_size)
        )
        t1 = time.time()
        logger.info(f"document vector creation took: {t1 - t0}")
        logger.info(f"vocab size: {vocab_size}")
        logger.info(f"document_vectors shape: {document_vectors.shape}")

        # compute distances
        t0 = time.time()
        word_dists = manhattan_distances(document_vectors, document_vectors)
        t1 = time.time()
        logger.info(f"manhatten distance took: {t1 - t0}")

        # mask out self distances and one half of the matrix
        zeroed_minuses = np.triu(np.ones_like(word_dists) * -1, k=0)
        zeroed_word_dists = np.tril(word_dists, k=-1)
        masked_word_dists = zeroed_word_dists + zeroed_minuses

        # find duplicates
        t0 = time.time()
        duplicate_pairs = np.transpose(
            np.where(
                (masked_word_dists <= max_different_words) & (masked_word_dists >= 0)
            )
        ).tolist()
        t1 = time.time()
        logger.info(f"finding duplicates took: {t1 - t0}")

        # map back to sdoc_ids
        duplicate_sdoc_id_pairs = [
            (idx2sdoc_id[pair[0]], idx2sdoc_id[pair[1]]) for pair in duplicate_pairs
        ]

        # we now create a graph with sdocs as nodes and edges between duplicates
        # we will use this graph to identify connected components, each subgraph is a group of duplicates
        t0 = time.time()
        G = nx.Graph()
        G.add_edges_from(duplicate_sdoc_id_pairs)
        G.to_undirected()
        subgraph_nodes = [list(subgraph) for subgraph in nx.connected_components(G)]
        t1 = time.time()
        logger.info(f"graph grouping took: {t1 - t0}")

        return subgraph_nodes
