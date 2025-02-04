from functools import lru_cache

from app.core.analysis.cota.pipeline.pipeline import COTARefinementPipeline


@lru_cache(maxsize=1)
def build_cota_refinement_pipeline(foo: str = "bar") -> COTARefinementPipeline:
    from app.core.analysis.cota.pipeline.steps.finetune_apply_compute import (
        finetune_apply_compute,
    )
    from app.core.analysis.cota.pipeline.steps.init_search_space import (
        init_search_space,
    )
    from app.core.analysis.cota.pipeline.steps.store_in_db import store_in_db

    pipeline = COTARefinementPipeline()

    pipeline.register_step(
        init_search_space,
        required_data=[],
    )
    pipeline.register_step(finetune_apply_compute, required_data=["search_space"])
    pipeline.register_step(
        store_in_db,
        required_data=["search_space"],
    )

    pipeline.freeze()

    return pipeline
