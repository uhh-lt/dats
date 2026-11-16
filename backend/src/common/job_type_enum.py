from enum import StrEnum


class JobType(StrEnum):
    """The jobs that are no pipeline steps. A job type is text: a pipeline step
    names its job type itself in `@register_job` (e.g. "text_es_index"), as
    its owner declares it. Members are `str`, so they serve wherever a job type
    is expected."""

    # entrypoints
    EXTRACT_ARCHIVE = "extract_archive"
    DOC_CHUNKING = "doc_chunking"
    SDOC_INIT = "sdoc_init"

    # on-demand jobs (short-lived)
    DUPLICATE_FINDER = "duplicate_finder"
    EXPORT = "export"
    IMPORT = "import"

    # on demand jobs (long-lived)
    TAG_RECOMMENDATION = "tag_recommendation"
    CLASSIFIER = "classifier"
    LLM_ASSISTANT = "llm_assistant"
    EXPERIMENT_RUN = "experiment_run"
    CRAWLER = "crawler"
    ARTEFACT_COMPUTATION = "artefact_computation"
    COTA_REFINEMENT = "cota_refinement"
    PERSPECTIVES = "perspectives"
