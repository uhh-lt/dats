from typing import List

import networkx as nx
import numpy as np
from sklearn.metrics.pairwise import manhattan_distances

from app.core.data.doc_type import DocType
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.word_frequency import WordFrequencyORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class DuplicateFinderService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        return super(DuplicateFinderService, cls).__new__(cls)

    def find_duplicate_text_sdocs(
        self, project_id: int, max_different_words: int
    ) -> List[List[int]]:
        with self.sqls.db_session() as db:
            result = (
                db.query(WordFrequencyORM)
                .join(WordFrequencyORM.source_document)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    SourceDocumentORM.doctype == DocType.text,
                )
                .all()
            )

        # unique words in project
        words = list(set([r.word for r in result]))
        words.sort()
        word2idx = {w: i for i, w in enumerate(words)}

        # process result to map
        sdoc_id2word_id2word_freq = {}
        for wf in result:
            if wf.sdoc_id not in sdoc_id2word_id2word_freq:
                sdoc_id2word_id2word_freq[wf.sdoc_id] = {}
            sdoc_id2word_id2word_freq[wf.sdoc_id][word2idx[wf.word]] = wf.count

        # X.create document vectors
        document_vectors = []
        idx2sdoc_id = {}
        for idx, sdoc_id in enumerate(sdoc_id2word_id2word_freq.keys()):
            word_id2_word_freq = sdoc_id2word_id2word_freq[sdoc_id]
            sdoc_vector = [
                word_id2_word_freq[word_id] if word_id in word_id2_word_freq else 0
                for word_id in range(len(words))
            ]
            idx2sdoc_id[idx] = sdoc_id
            document_vectors.append(sdoc_vector)
        document_vectors = np.array(document_vectors)

        # compute distances
        word_dists = manhattan_distances(document_vectors, document_vectors)

        # mask out self distances and one half of the matrix
        minuses = np.ones_like(word_dists) * -1
        zeroed_minuses = np.triu(minuses, k=0)
        zeroed_word_dists = np.tril(word_dists, k=-1)
        masked_word_dists = zeroed_word_dists + zeroed_minuses

        # find duplicates
        duplicate_pairs = np.transpose(
            np.where(
                (masked_word_dists <= max_different_words) & (masked_word_dists >= 0)
            )
        ).tolist()

        # map back to sdoc_ids
        duplicate_sdoc_id_pairs = [
            (idx2sdoc_id[pair[0]], idx2sdoc_id[pair[1]]) for pair in duplicate_pairs
        ]

        # we now create a graph with sdocs as nodes and edges between duplicates
        # we will use this graph to identify connected components, each subgraph is a group of duplicates
        duplicate_sdoc_ids = list(
            set(
                [pair[0] for pair in duplicate_sdoc_id_pairs]
                + [pair[1] for pair in duplicate_sdoc_id_pairs]
            )
        )
        G = nx.Graph()
        G.add_nodes_from(duplicate_sdoc_ids)
        G.add_edges_from(duplicate_sdoc_id_pairs)
        G.to_undirected()
        subgraphs = list(nx.connected_components(G))
        subgraph_nodes = [list(subgraph) for subgraph in subgraphs]

        return subgraph_nodes
