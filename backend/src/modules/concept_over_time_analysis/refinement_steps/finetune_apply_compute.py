import numpy as np
from loguru import logger
from umap.umap_ import UMAP

from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTARead,
    COTASentence,
)
from repos.ray.dto.cota import (
    RayCOTAJobInput,
    RayCOTAJobResponse,
    RayCOTASentenceBase,
)
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo


def finetune_apply_compute(
    cota: COTARead, search_space: list[COTASentence]
) -> list[COTASentence]:
    # 1. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    if __has_min_concept_sentence_annotations(cota=cota, search_space=search_space):
        visual_refined_embeddings, concept_similarities, probabilities = (
            __ray_cota_finetune_apply_compute(
                cota_id=cota.id,
                project_id=cota.project_id,
                concepts=cota.concepts,
                search_space=search_space,
            )
        )
        # update search_space with the concept similarities
        for concept_id, similarities in concept_similarities.items():
            for sentence, similarity in zip(search_space, similarities):
                sentence.concept_similarities[concept_id] = similarity

    else:
        with WeaviateRepo().weaviate_session() as client:
            embeddings = crud_sentence_embedding.get_embeddings(
                client=client,
                project_id=cota.project_id,
                ids=[
                    SentenceObjectIdentifier(
                        sdoc_id=cota_sent.sdoc_id,
                        sentence_id=cota_sent.sentence_id,
                    )
                    for cota_sent in search_space
                ],
            )

        embeddings_tensor = np.array(embeddings)
        probabilities = [[0.5, 0.5] for _ in search_space]
        logger.debug("No model exists. We use weaviate embeddings.")
        # Visualize results: Reduce the refined embeddings with UMAP to 2D
        visual_refined_embeddings = __apply_umap(embs=embeddings_tensor, n_components=2)

    # 2. update search_space with the 2D coordinates
    for sentence, coordinates in zip(search_space, visual_refined_embeddings):
        sentence.x = coordinates[0]
        sentence.y = coordinates[1]

    # 3. update search_space with concept_probabilities
    for sentence, probabilities_outer in zip(search_space, probabilities):
        for concept, probability in zip(cota.concepts, probabilities_outer):
            sentence.concept_probabilities[concept.id] = probability

    return search_space


def __ray_cota_finetune_apply_compute(
    cota_id: int,
    project_id: int,
    concepts: list[COTAConcept],
    search_space: list[COTASentence],
) -> tuple[list[list[float]], dict[str, list[float]], list[list[float]]]:
    concept_ids: list[str] = [concept.id for concept in concepts]
    ray_search_space: list[RayCOTASentenceBase] = [
        RayCOTASentenceBase(
            concept_annotation=sentence.concept_annotation, text=sentence.text
        )
        for sentence in search_space
    ]
    job = RayCOTAJobInput(
        id=cota_id,
        project_id=project_id,
        concept_ids=concept_ids,
        search_space=ray_search_space,
    )
    response: RayCOTAJobResponse = RayRepo().cota_finetune_apply_compute(job)
    return (
        response.visual_refined_embeddings,
        response.concept_similarities,
        response.probabilities,
    )


def __apply_umap(
    embs: np.ndarray,
    n_components: int,
) -> list[list[float]]:
    reducer = UMAP(n_components=n_components)
    reduced_embs = reducer.fit_transform(embs)
    assert isinstance(reduced_embs, np.ndarray)
    return reduced_embs.tolist()


def __get_concept_sentence_annotations(
    cota: COTARead,
    search_space: list[COTASentence],
) -> dict[str, list[COTASentence]]:
    """Returns the sentences in the search space that are annotated with a concept, for each concept"""
    annotations: dict[str, list[COTASentence]] = {
        concept.id: [] for concept in cota.concepts
    }
    for sentence in search_space:
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(sentence)
    return annotations


def __has_min_concept_sentence_annotations(
    cota: COTARead,
    search_space: list[COTASentence],
) -> bool:
    """Returns true if each concept has at least min_required_annotations_per_concept"""

    annotations = __get_concept_sentence_annotations(
        cota=cota, search_space=search_space
    )

    for concept_id, concept_annotations in annotations.items():
        if (
            len(concept_annotations)
            < cota.training_settings.min_required_annotations_per_concept
        ):
            return False

    return True
