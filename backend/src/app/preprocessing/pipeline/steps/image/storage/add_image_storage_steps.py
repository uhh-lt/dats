from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline


def add_image_storage_steps(pipeline: PreprocessingPipeline) -> None:
    from app.preprocessing.pipeline.steps.image.storage.index_image_document_for_simsearch import (
        index_image_document_for_simsearch,
    )
    from app.preprocessing.pipeline.steps.image.storage.persist_bbox_annotations import (
        persist_bbox_annotations,
    )

    pipeline.register_step(
        func=persist_bbox_annotations,
        required_data=["ppid"],
    )

    pipeline.register_step(
        func=index_image_document_for_simsearch,
        required_data=["ppid", "sdoc_id"],
    )
