from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from preprocessing.pipeline.steps.text.storage.persist_sdoc_links import (
    persist_sdoc_links,
)
from preprocessing.pipeline.steps.text.storage.persist_sdoc_word_frequencies import (
    persist_sdoc_word_frequencies,
)
from preprocessing.pipeline.steps.text.storage.persist_sentence_annotations import (
    persist_sentence_annotations,
)
from preprocessing.pipeline.steps.text.storage.persist_span_annotations import (
    persist_span_annotations,
)
from repos.db.sql_repo import SQLRepo

sql: SQLRepo = SQLRepo()


def add_text_storage_steps(pipeline: PreprocessingPipeline) -> None:
    # persist SourceDocument Links
    pipeline.register_step(
        func=persist_sdoc_links,
        required_data=["pptd"],
    )

    # persist SpanAnnotations
    pipeline.register_step(
        func=persist_span_annotations,
        required_data=["pptd"],
    )

    # persist SentenceAnnotations
    pipeline.register_step(
        func=persist_sentence_annotations,
        required_data=["pptd"],
    )

    # persist WordFrequencies
    pipeline.register_step(
        func=persist_sdoc_word_frequencies,
        required_data=["pptd"],
    )
