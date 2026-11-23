import yake

from common.doc_type_enum import DocType
from core.artefacts.content.content_artefact import CONTENT
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.text_step_utils import read_stored_text
from modules.keyword_statistics.keywords_artefact import (
    KEYWORDS,
    KEYWORDS_METADATA_KEY,
)
from repos.db.sql_repo import SQLRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()

# the keyword extraction (YAKE): the keywords per document, the longest
# n-gram of a keyword, and how similar two keywords may be before the
# lower-ranked one is dropped
KEYWORD_NUMBER = 5
KEYWORD_MAX_NGRAM_SIZE = 2
KEYWORD_DEDUPLICATION_THRESHOLD = 0.5


class KeywordsJobInput(SdocProcessingJobInput):
    doctype: DocType
    text: str
    language: str


def enrich_for_recompute(payload: SdocProcessingJobInput) -> KeywordsJobInput:
    stored = read_stored_text(payload.sdoc_id)
    return KeywordsJobInput(
        **payload.model_dump(),
        doctype=stored.doctype,
        text=stored.text,
        language=stored.language,
    )


@pipeline_step(
    requires={CONTENT, LANGUAGE},
    produces={KEYWORDS},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="keywords",
    input_type=KeywordsJobInput,
    enricher=enrich_for_recompute,
)
def handle_keywords_job(payload: KeywordsJobInput, job: Job) -> None:
    keywords = extract_keywords(payload)
    with sqlr.transaction() as db:
        KEYWORDS.store.write(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            values={KEYWORDS_METADATA_KEY: keywords},
        )


def extract_keywords(payload: KeywordsJobInput) -> list[str]:
    """The keywords of the text (YAKE, no spaCy)."""
    kw_extractor = yake.KeywordExtractor(
        lan=payload.language,
        n=KEYWORD_MAX_NGRAM_SIZE,
        dedupLim=KEYWORD_DEDUPLICATION_THRESHOLD,
        windowsSize=1,
        top=KEYWORD_NUMBER,
    )
    return [kw for kw, _ in kw_extractor.extract_keywords(payload.text)]
