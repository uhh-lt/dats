from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from preprocessing.pipeline.steps.common.storage.persist_sdoc_info import (
    persist_sdoc_info,
)


def add_common_storage_steps(pipeline: PreprocessingPipeline) -> None:
    from preprocessing.pipeline.steps.common.storage.index_text_document_for_simsearch import (
        index_text_document_for_simsearch,
    )
    from preprocessing.pipeline.steps.common.storage.remove_erroneous_sdoc import (
        remove_erroneous_or_unfinished_sdocs,
    )
    from preprocessing.pipeline.steps.common.storage.store_document_in_elasticsearch import (
        store_document_in_elasticsearch,
    )

    pipeline.register_step(
        # this method should be called before writing a document to the database.
        # So in case the document is already in the database but not finished
        # or erroneous, we remove it to make the preprocessing idempotent.
        func=remove_erroneous_or_unfinished_sdocs,
    )

    pipeline.register_step(func=persist_sdoc_info, required_data=["pptd"])

    pipeline.register_step(
        func=store_document_in_elasticsearch,
        required_data=["pptd", "sdoc_id"],
    )

    pipeline.register_step(
        func=index_text_document_for_simsearch,
        required_data=["pptd", "sdoc_id"],
    )
