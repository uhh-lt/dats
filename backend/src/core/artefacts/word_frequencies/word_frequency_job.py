from collections import Counter

from common.doc_type_enum import DocType
from core.artefacts.content.content_artefact import CONTENT
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.text_step_utils import read_stored_text
from core.artefacts.word_frequencies.word_frequencies_artefact import (
    WORD_FREQUENCIES,
)
from core.artefacts.word_frequencies.word_frequency_dto import WordFrequencyCreate
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class WordFrequencyJobInput(SdocProcessingJobInput):
    text: str
    language: str


def enrich_for_recompute(payload: SdocProcessingJobInput) -> WordFrequencyJobInput:
    stored = read_stored_text(payload.sdoc_id)
    return WordFrequencyJobInput(
        **payload.model_dump(), text=stored.text, language=stored.language
    )


@pipeline_step(
    requires={CONTENT, LANGUAGE},
    produces={WORD_FREQUENCIES},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="word_frequency",
    input_type=WordFrequencyJobInput,
    enricher=enrich_for_recompute,
)
def handle_word_frequency_job(payload: WordFrequencyJobInput, job: Job) -> None:
    spacy_output = ray.spacy_pipline(
        SpacyInput(text=payload.text, language=payload.language)
    )
    with sqlr.transaction() as db:
        WORD_FREQUENCIES.store.delete_by_sdoc_id(db=db, sdoc_id=payload.sdoc_id)
        WORD_FREQUENCIES.store.create_multi(
            db=db,
            create_dtos=extract_word_frequencies(payload.sdoc_id, spacy_output),
        )


def extract_word_frequencies(
    sdoc_id: int, spacy_output: SpacyPipelineOutput
) -> list[WordFrequencyCreate]:
    word_freqs: Counter[str] = Counter()
    for token in spacy_output.tokens:
        if not (token.is_stopword or token.is_punctuation) and (
            token.is_alpha or token.is_digit
        ):
            word_freqs.update((token.text,))

    return [
        WordFrequencyCreate(sdoc_id=sdoc_id, word=word, count=count)
        for word, count in word_freqs.items()
    ]
