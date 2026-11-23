from common.doc_type_enum import DocType
from core.artefacts.content.content_artefact import CONTENT
from core.artefacts.html_mapping_utils import HTMLTextMapper
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.text_step_utils import read_stored_text
from core.artefacts.tokens_sentences.tokens_sentences_artefact import (
    TOKENS_SENTENCES,
)
from core.artefacts.transcript.transcript_artefact import TRANSCRIPT
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class SpacyJobInput(SdocProcessingJobInput):
    # everything below is queryable:
    doctype: DocType
    text: str
    language: str
    raw_html: str
    # the words of the transcript of an audio or video, its tokens; None for
    # other doctypes, which spaCy tokenizes
    word_offsets: tuple[list[int], list[int]] | None


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> SpacyJobInput:
    stored = read_stored_text(payload.sdoc_id)
    return SpacyJobInput(
        **payload.model_dump(),
        doctype=stored.doctype,
        text=stored.text,
        raw_html=stored.raw_html,
        language=stored.language,
        word_offsets=_read_word_offsets(payload.sdoc_id, stored.doctype),
    )


def _read_word_offsets(
    sdoc_id: int, doctype: DocType
) -> tuple[list[int], list[int]] | None:
    """The word offsets of the transcript of an audio or video, which the
    transcription (before the content) stored."""
    if doctype not in {DocType.audio, DocType.video}:
        return None
    with sqlr.transaction() as db:
        transcript = TRANSCRIPT.store.read(db=db, sdoc_id=sdoc_id)
        assert (
            transcript.transcript_word_starts is not None
            and transcript.transcript_word_ends is not None
        ), f"The transcript of document {sdoc_id} has no words!"
        return transcript.transcript_word_starts, transcript.transcript_word_ends


@pipeline_step(
    requires={CONTENT, LANGUAGE},
    produces={TOKENS_SENTENCES},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="tokens_sentences",
    input_type=SpacyJobInput,
    enricher=enrich_for_recompute,
)
def handle_tokens_sentences_job(payload: SpacyJobInput, job: Job) -> None:
    spacy_output = ray.spacy_pipline(
        SpacyInput(text=payload.text, language=payload.language)
    )
    sdoc_data = extract_tok_sent_data(spacy_output, payload.raw_html)

    # the tokens of an audio or video are the words of its transcript, so the
    # word times fit the tokens; spaCy splits the sentences only
    token_starts, token_ends = payload.word_offsets or (
        sdoc_data["token_starts"],
        sdoc_data["token_ends"],
    )
    with sqlr.transaction() as db:
        TOKENS_SENTENCES.store.write(
            db=db,
            sdoc_id=payload.sdoc_id,
            update=SourceDocumentDataUpdate(
                token_starts=token_starts,
                token_ends=token_ends,
                sentence_starts=sdoc_data["sentence_starts"],
                sentence_ends=sdoc_data["sentence_ends"],
            ),
        )


def extract_tok_sent_data(
    spacy_output: SpacyPipelineOutput,
    raw_html: str,
) -> dict:
    token_starts: list[int] = []
    token_ends: list[int] = []
    for token in spacy_output.tokens:
        token_starts.append(token.start_char)
        token_ends.append(token.end_char)

    # 1. Parse raw HTML with HTMLTextMapper to find block boundaries in plain text
    parser = HTMLTextMapper()
    results = parser(raw_html)

    block_boundaries = set()
    current_len = 0
    for r in results:
        if r.get("new_block"):
            block_boundaries.add(current_len)
        current_len += len(r["text"]) + 1

    # 2. Iterate through SpaCy sentences and split them at block boundaries
    sentence_starts: list[int] = []
    sentence_ends: list[int] = []
    for s in spacy_output.sents:
        s_start = s.start_char
        s_end = s.end_char

        # Find all boundaries that lie strictly inside this sentence
        boundaries_in_sent = sorted(
            [b for b in block_boundaries if s_start < b < s_end]
        )

        last_start = s_start
        for b in boundaries_in_sent:
            # We split the sentence: [last_start, b - 1] (excluding the joining space)
            if b - 1 > last_start:
                sentence_starts.append(last_start)
                sentence_ends.append(b - 1)
            last_start = b

        if s_end > last_start:
            sentence_starts.append(last_start)
            sentence_ends.append(s_end)

    return {
        "token_starts": token_starts,
        "token_ends": token_ends,
        "sentence_starts": sentence_starts,
        "sentence_ends": sentence_ends,
    }
