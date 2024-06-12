from typing import Dict, List, Tuple

from app.core.data.dto.concept_over_time_analysis import (
    COTAConcept,
    COTASentence,
)
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.cota import (
    RayCOTAJobInput,
    RayCOTAJobResponse,
    RayCOTASentenceBase,
)
from app.util.singleton_meta import SingletonMeta


class CotaService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.rms = RayModelService()

        return super(CotaService, cls).__new__(cls)

    def cota_finetune_apply_compute(
        self,
        cota_id: int,
        project_id: int,
        concepts: List[COTAConcept],
        search_space: List[COTASentence],
    ) -> Tuple[List[List[float]], Dict[str, List[float]], List[List[float]]]:
        concept_ids: List[str] = [concept.id for concept in concepts]
        ray_search_space: List[RayCOTASentenceBase] = [
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
        response: RayCOTAJobResponse = self.rms.cota_finetune_apply_compute(job)
        return (
            response.visual_refined_embeddings,
            response.concept_similarities,
            response.probabilities,
        )
