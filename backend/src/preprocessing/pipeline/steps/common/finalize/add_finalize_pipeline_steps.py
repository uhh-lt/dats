from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_finalize_pipeline_steps(pipeline: PreprocessingPipeline) -> None:
    from preprocessing.pipeline.steps.common.finalize.resolve_sdoc_links import (
        resolve_sdoc_links,
    )
    from preprocessing.pipeline.steps.common.finalize.update_sdoc_status_to_finish import (
        update_sdoc_status_to_finish,
    )

    pipeline.register_step(
        func=resolve_sdoc_links,
    )

    pipeline.register_step(
        func=update_sdoc_status_to_finish,
        required_data=["sdoc_id"],
    )
