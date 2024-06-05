from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.steps.util import (
    has_min_concept_sentence_annotations,
)
from app.core.cota.cota_service import CotaService

cs = CotaService()


def finetune_st(cargo: Cargo) -> Cargo:
    # Only train if we have enough annotated data
    if not has_min_concept_sentence_annotations(cargo):
        return cargo

    cs.cota_refinement(
        cota_id=cargo.job.cota.id,
        project_id=cargo.job.cota.project_id,
        min_required_annotations_per_concept=cargo.job.cota.training_settings.min_required_annotations_per_concept,
        concepts=cargo.job.cota.concepts,
        search_space=cargo.data["search_space"],
    )

    return cargo
