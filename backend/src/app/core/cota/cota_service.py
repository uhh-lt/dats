from typing import List

from app.core.data.dto.concept_over_time_analysis import (
    COTAConcept,
    COTASentence,
)
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.cota import (
    RayCOTARefinementJob,
    RayCOTASentence,
)
from app.util.singleton_meta import SingletonMeta


class CotaService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.rms = RayModelService()

        return super(CotaService, cls).__new__(cls)

    def cota_refinement(
        self,
        cota_id: int,
        project_id: int,
        min_required_annotations_per_concept: int,
        concepts: List[COTAConcept],
        search_space: List[COTASentence],
    ) -> None:
        # make the Ray dtos independent from core dtos. TODO if dtos actually differ.
        concept_ids: List[str] = [concept.id for concept in concepts]
        ray_search_space: List[RayCOTASentence] = [
            RayCOTASentence(
                concept_annotation=sentence.concept_annotation, text=sentence.text
            )
            for sentence in search_space
        ]
        job = RayCOTARefinementJob(
            id=cota_id,
            project_id=project_id,
            min_required_annotations_per_concept=min_required_annotations_per_concept,
            concept_ids=concept_ids,
            search_space=ray_search_space,
        )
        self.rms.cota_refinement(job)

    def cota_apply_st(
        self,
        cota_id: int,
        project_id: int,
        min_required_annotations_per_concept: int,
        concepts: List[COTAConcept],
        search_space: List[COTASentence],
    ) -> None:
        # make the Ray dtos independent from core dtos. TODO if dtos actually differ.
        concept_ids: List[str] = [concept.id for concept in concepts]
        ray_search_space: List[RayCOTASentence] = [
            RayCOTASentence(
                concept_annotation=sentence.concept_annotation, text=sentence.text
            )
            for sentence in search_space
        ]
        job = RayCOTARefinementJob(
            id=cota_id,
            project_id=project_id,
            min_required_annotations_per_concept=min_required_annotations_per_concept,
            concept_ids=concept_ids,
            search_space=ray_search_space,
        )
        self.rms.cota_refinement(job)
