from typing import Dict, List

import numpy as np
from loguru import logger
from umap.umap_ import UMAP

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.cota.cota_service import CotaService
from app.core.data.dto.concept_over_time_analysis import (
    COTASentence,
)
from app.core.data.repo.repo_service import RepoService
from app.core.search.simsearch_service import SimSearchService

cs = CotaService()
repo: RepoService = RepoService()
sims: SimSearchService = SimSearchService()


def finetune_apply_compute(cargo: Cargo) -> Cargo:
    # 1. get required data
    search_space: List[COTASentence] = cargo.data["search_space"]

    # 2. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    if __has_min_concept_sentence_annotations(cargo):
        # visual_refined_embeddings, probabilities = call_ray()
        visual_refined_embeddings, concept_similarities, probabilities = (
            cs.cota_finetune_apply_compute(
                cota_id=cargo.job.cota.id,
                project_id=cargo.job.cota.project_id,
                concepts=cargo.job.cota.concepts,
                search_space=search_space,
            )
        )
        # update search_space with the concept similarities
        for concept_id, similarities in concept_similarities.items():
            for sentence, similarity in zip(search_space, similarities):
                sentence.concept_similarities[concept_id] = similarity

    else:
        embeddings_tensor = sims.get_sentence_embeddings(
            search_tuples=[
                (cota_sent.sentence_id, cota_sent.sdoc_id) for cota_sent in search_space
            ]
        )
        probabilities = [[0.5, 0.5] for _ in search_space]
        logger.debug("No model exists. We use weaviate embeddings.")
        visual_refined_embeddings = __apply_umap(embs=embeddings_tensor, n_components=2)
    # 3. Visualize results: Reduce the refined embeddings with UMAP to 2D

    # 3.2 update search_space with the 2D coordinates
    for sentence, coordinates in zip(search_space, visual_refined_embeddings):
        sentence.x = coordinates[0]
        sentence.y = coordinates[1]

    # 4. update search_space with concept_probabilities
    for sentence, probabilities_outer in zip(search_space, probabilities):
        for concept, probability in zip(cargo.job.cota.concepts, probabilities_outer):
            sentence.concept_probabilities[concept.id] = probability

    return cargo


def __apply_umap(
    embs: np.ndarray,
    n_components: int,
) -> List[List[float]]:
    reducer = UMAP(n_components=n_components)
    reduced_embs = reducer.fit_transform(embs)
    assert isinstance(reduced_embs, np.ndarray)
    return reduced_embs.tolist()


def __get_concept_sentence_annotations(cargo: Cargo) -> Dict[str, List[COTASentence]]:
    """Returns the sentences in the search space that are annotated with a concept, for each concept"""
    annotations: Dict[str, List[COTASentence]] = {
        concept.id: [] for concept in cargo.job.cota.concepts
    }
    for sentence in cargo.data["search_space"]:
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(sentence)
    return annotations


def __has_min_concept_sentence_annotations(cargo: Cargo) -> bool:
    """Returns true if each concept has at least min_required_annotations_per_concept"""

    annotations = __get_concept_sentence_annotations(cargo)

    for concept_id, concept_annotations in annotations.items():
        if (
            len(concept_annotations)
            < cargo.job.cota.training_settings.min_required_annotations_per_concept
        ):
            return False

    return True
