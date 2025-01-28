from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from app.preprocessing.pipeline.steps.text.storage.persist_sdoc_links import (
    persist_sdoc_links,
)
from app.preprocessing.pipeline.steps.text.storage.persist_sdoc_word_frequencies import (
    persist_sdoc_word_frequencies,
)
from app.preprocessing.pipeline.steps.text.storage.persist_span_annotations import (
    persist_span_annotations,
)

sql: SQLService = SQLService()


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

    # persist WordFrequencies
    pipeline.register_step(
        func=persist_sdoc_word_frequencies,
        required_data=["pptd"],
    )
