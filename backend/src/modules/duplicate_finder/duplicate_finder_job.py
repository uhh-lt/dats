import time

import networkx as nx
import torch
from loguru import logger
from pydantic import Field

from common.doc_type import DocType
from common.job_type import JobType
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobOutputBase,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
BATCH_SIZE = 1024


class DuplicateFinderInput(JobInputBase):
    max_different_words: int = Field(
        ..., description="Number of different words allowed between duplicates"
    )
    tag_id: int | None = Field(
        description="Tag id to filter source documents. If not provided, all source documents are considered.",
    )


class DuplicateFinderOutput(JobOutputBase):
    duplicates: list[list[int]] = Field(
        ..., description="List of found duplicate clusters"
    )


@register_job(
    job_type=JobType.DUPLICATE_FINDER,
    input_type=DuplicateFinderInput,
    output_type=DuplicateFinderOutput,
    generate_endpoints=EndpointGeneration.MINIMAL,
    device="gpu",
)
def find_duplicates_job(
    payload: DuplicateFinderInput,
    job: Job,
) -> DuplicateFinderOutput:
    # fetch word frequencies from db
    job.update(status_message="Fetching word frequencies from database")
    logger.info("Fetching word frequencies from database")
    t0 = time.time()
    with sqlr.db_session() as db:
        if payload.tag_id is not None:
            result = crud_word_frequency.read_by_project_and_doctype_and_tag(
                db,
                project_id=payload.project_id,
                doctype=DocType.text,
                tag_id=payload.tag_id,
            )
        else:
            result = crud_word_frequency.read_by_project_and_doctype(
                db, project_id=payload.project_id, doctype=DocType.text
            )
    t1 = time.time()
    logger.info(f"query took: {t1 - t0}")

    # Create document vectors
    job.update(status_message="Creating document word vectors")
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

    # create document vectors
    idx2sdoc_id = {}
    N = len(sdoc_id2word_id2word_freq)
    device = job.get_device()
    document_vectors = torch.zeros((N, vocab_size), dtype=torch.float32, device=device)
    for idx, sdoc_id in enumerate(sdoc_id2word_id2word_freq.keys()):
        idx2sdoc_id[idx] = sdoc_id
        word_id2_word_freq = sdoc_id2word_id2word_freq[sdoc_id]
        for word_idx, freq in word_id2_word_freq.items():
            document_vectors[idx, word_idx] = freq

    t1 = time.time()
    logger.info(f"document vector creation took: {t1 - t0}")
    logger.info(f"vocab size: {vocab_size}")
    logger.info(f"document_vectors shape: {document_vectors.shape}")

    # compute distances to identify duplicates
    t0 = time.time()
    duplicate_pairs = []
    device = job.get_device()
    num_batches = (N + BATCH_SIZE - 1) // BATCH_SIZE
    for i in range(0, N, BATCH_SIZE):
        job.update(
            status_message=f"Finding duplicates! (Batch {i // BATCH_SIZE + 1}/{num_batches})",
        )
        a_batch = document_vectors[i : i + BATCH_SIZE]
        a_indices = list(range(i, min(i + BATCH_SIZE, N)))
        b_batch = document_vectors[: i + BATCH_SIZE]
        b_indices = list(range(0, min(i + BATCH_SIZE, N)))

        dists = torch.cdist(a_batch, b_batch, p=1).cpu().numpy()
        for bi, doc_i in enumerate(a_indices):
            for bj, doc_j in enumerate(b_indices):
                # Avoid self-pairs and duplicate pairs
                if doc_i < doc_j:
                    if dists[bi, bj] <= payload.max_different_words:
                        duplicate_pairs.append([doc_i, doc_j])
    t1 = time.time()
    logger.info(f"finding duplicates took: {t1 - t0}")

    # map back to sdoc_ids
    duplicate_sdoc_id_pairs = [
        (idx2sdoc_id[pair[0]], idx2sdoc_id[pair[1]]) for pair in duplicate_pairs
    ]

    # we now create a graph with sdocs as nodes and edges between duplicates
    # we will use this graph to identify connected components, each subgraph is a group of duplicates
    job.update(status_message="Grouping duplicates...")
    t0 = time.time()
    G = nx.Graph()
    G.add_edges_from(duplicate_sdoc_id_pairs)
    G.to_undirected()
    subgraph_nodes = [list(subgraph) for subgraph in nx.connected_components(G)]
    t1 = time.time()
    logger.info(f"graph grouping took: {t1 - t0}")

    # Free memory
    del document_vectors
    torch.cuda.empty_cache()

    job.update(status_message="Finished finding duplicates!")
    return DuplicateFinderOutput(duplicates=subgraph_nodes)
