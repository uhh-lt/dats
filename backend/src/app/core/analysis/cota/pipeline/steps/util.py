from typing import Dict, List

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.concept_over_time_analysis import COTASentence


def __get_concept_sentence_annotations(cargo: Cargo) -> Dict[str, List[COTASentence]]:
    """Returns the sentences in the search space that are annotated with a concept, for each concept"""
    annotations: Dict[str, List[COTASentence]] = {
        concept.id: [] for concept in cargo.job.cota.concepts
    }
    for sentence in cargo.data["search_space"]:
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(sentence)
    return annotations


def has_min_concept_sentence_annotations(cargo: Cargo) -> bool:
    """Returns true if each concept has at least min_required_annotations_per_concept"""

    annotations = __get_concept_sentence_annotations(cargo)

    for concept_id, concept_annotations in annotations.items():
        if (
            len(concept_annotations)
            < cargo.job.cota.training_settings.min_required_annotations_per_concept
        ):
            return False

    return True
