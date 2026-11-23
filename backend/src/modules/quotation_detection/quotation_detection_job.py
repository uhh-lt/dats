from typing import NamedTuple
from uuid import uuid4

from loguru import logger

from common.doc_type_enum import DocType
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.tokens_sentences.tokens_sentences_artefact import (
    TOKENS_SENTENCES,
)
from modules.quotation_detection.quotation_artefact import QUOTATIONS
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.quote import QuoteInputDoc, QuoteJobInput, Span, Token
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()

# the quotation model handles German text documents only
QUOTATION_DOCTYPE = DocType.text
QUOTATION_LANGUAGE = "de"


class _QuoteCodeIds(NamedTuple):
    quote: int
    direct: int
    indirect: int
    reported: int
    frin: int
    infr: int
    frame: int
    speaker: int
    addr: int
    cue: int


# the names of the quotation codes, in the order of the fields of _QuoteCodeIds
_QUOTE_CODE_NAMES = (
    "QUOTE",
    "DIRECT",
    "INDIRECT",
    "REPORTED",
    "FREE_INDIRECT",
    "INDIRECT_FREE_INDIRECT",
    "FRAME",
    "SPEAKER",
    "ADDRESSEE",
    "CUE",
)


class QuotationDetectionJobInput(SdocProcessingJobInput):
    # the input of the quotation model; None for a document that is no German
    # text document, whose quotations the step removes
    document: QuoteInputDoc | None


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> QuotationDetectionJobInput:
    with sqlr.transaction() as db:
        sdoc_data = TOKENS_SENTENCES.store.read(db=db, sdoc_id=payload.sdoc_id)
        language = LANGUAGE.store.read(db=db, sdoc_id=payload.sdoc_id)
        # the quotation model handles German text documents only; the token data
        # of other documents is never read, it may not fit the model
        if (
            sdoc_data.source_document.doctype != QUOTATION_DOCTYPE
            or language.str_value != QUOTATION_LANGUAGE
        ):
            return QuotationDetectionJobInput(**payload.model_dump(), document=None)

        return QuotationDetectionJobInput(
            **payload.model_dump(),
            document=QuoteInputDoc(
                id=payload.sdoc_id,
                text=sdoc_data.content,
                tokens=[
                    Token(start=start, end=end, sent=sid, text=text)
                    for start, end, sid, text in zip(
                        sdoc_data.token_starts,
                        sdoc_data.token_ends,
                        sdoc_data.token_sentence_ids,
                        sdoc_data.tokens,
                    )
                ],
                sentences=[
                    Span(start=start, end=end + 1, text=text)
                    for start, end, text in zip(
                        sdoc_data.sentence_token_starts,
                        sdoc_data.sentence_token_ends,
                        sdoc_data.sentences,
                    )
                ],
            ),
        )


@pipeline_step(
    requires={TOKENS_SENTENCES, LANGUAGE},
    produces={QUOTATIONS},
    # the doctypes of tokens_sentences, which a step that follows it must apply to; the
    # enricher and handler skip all but German text documents
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="quotation_detection",
    input_type=QuotationDetectionJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_quotation_detection_job(
    payload: QuotationDetectionJobInput, job: Job
) -> None:
    document = payload.document
    output = (
        None
        if document is None
        else ray.quote_prediction(
            QuoteJobInput(
                id=payload.sdoc_id, project_id=payload.project_id, documents=[document]
            )
        )
    )

    with sqlr.transaction() as db:
        store = QUOTATIONS.store
        # a skipped document keeps no quotations of an earlier run, e.g. from
        # before its language changed
        if document is None or output is None:
            logger.info(
                f"Document {payload.sdoc_id} is no German text document: "
                "removing its quotations without detecting new ones."
            )
            store.clear(db=db, project_id=payload.project_id, sdoc_id=payload.sdoc_id)
            return

        system_code_ids = store.code_ids(db=db, project_id=payload.project_id)
        codes = _QuoteCodeIds(*(system_code_ids[name] for name in _QUOTE_CODE_NAMES))
        adoc_id = store.annotation_document_id(db=db, sdoc_id=payload.sdoc_id)
        store.replace_groups(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            groups=[
                [
                    *_make_span_annos(
                        payload,
                        document,
                        adoc_id,
                        _get_quote_type(quote.typ, codes),
                        quote.quote,
                    ),
                    *_make_span_annos(
                        payload, document, adoc_id, codes.frame, quote.frame
                    ),
                    *_make_span_annos(
                        payload, document, adoc_id, codes.addr, quote.addressee
                    ),
                    *_make_span_annos(payload, document, adoc_id, codes.cue, quote.cue),
                    *_make_span_annos(
                        payload, document, adoc_id, codes.speaker, quote.speaker
                    ),
                ]
                for doc in output.documents
                for quote in doc.quotes
            ],
        )


def _make_span_annos(
    payload: QuotationDetectionJobInput,
    document: QuoteInputDoc,
    adoc_id: int,
    code_id: int,
    spans: list[tuple[int, int]],
) -> list[SpanAnnotationCreateIntern]:
    """One span annotation per token span (begin token, end token exclusive)."""
    tokens = document.tokens
    annos: list[SpanAnnotationCreateIntern] = []
    for start, end in spans:
        char_begin = tokens[start].start
        char_end = tokens[end - 1].end
        annos.append(
            SpanAnnotationCreateIntern(
                project_id=payload.project_id,
                uuid=str(uuid4()),
                begin_token=start,
                end_token=end,
                begin=char_begin,
                end=char_end,
                span_text=document.text[char_begin:char_end],
                code_id=code_id,
                annotation_document_id=adoc_id,
            )
        )
    return annos


def _get_quote_type(typ: str, codes: _QuoteCodeIds) -> int:
    match typ:
        case "Direct":
            return codes.direct
        case "Indirect":
            return codes.indirect
        case "Reported":
            return codes.reported
        case "FreeIndirect":
            return codes.frin
        case "IndirectFreeIndirect":
            return codes.infr
    logger.warning(f"Could not find code for quote type {typ}, using fallback")
    return codes.quote
