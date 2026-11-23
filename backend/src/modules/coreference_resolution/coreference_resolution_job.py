from uuid import uuid4

from pydantic import BaseModel

from common.doc_type_enum import DocType
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.tokens_sentences.tokens_sentences_artefact import (
    TOKENS_SENTENCES,
)
from modules.coreference_resolution.coreference_artefact import COREFERENCES
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.coref import CorefInputDoc, CorefJobInput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()

# the only language the coreference model supports
COREF_LANGUAGE = "de"


class CorefText(BaseModel):
    """The German text document the model resolves."""

    content: str
    tokenized_sentences: list[list[str]]
    token_character_offsets: list[tuple[int, int]]


class CoreferenceResolutionJobInput(SdocProcessingJobInput):
    # None for a document that is not a German text: the step only clears it
    text: CorefText | None


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> CoreferenceResolutionJobInput:
    with sqlr.transaction() as db:
        sdoc_data = TOKENS_SENTENCES.store.read(db=db, sdoc_id=payload.sdoc_id)
        language = LANGUAGE.store.read(db=db, sdoc_id=payload.sdoc_id)

        # text documents only, and the model supports German only: other
        # documents get no model input, so the step clears their earlier output
        # (delete the doctype check to also resolve German transcripts and captions)
        doctype = DocType(sdoc_data.source_document.doctype)
        if doctype != DocType.text or language.str_value != COREF_LANGUAGE:
            return CoreferenceResolutionJobInput(**payload.model_dump(), text=None)

        return CoreferenceResolutionJobInput(
            **payload.model_dump(),
            text=CorefText(
                content=sdoc_data.content,
                tokenized_sentences=sdoc_data.tokenized_sentences,
                token_character_offsets=sdoc_data.token_character_offsets,
            ),
        )


@pipeline_step(
    requires={TOKENS_SENTENCES, LANGUAGE},
    produces={COREFERENCES},
    # the doctypes of tokens_sentences, which the step follows; it resolves text only
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="coreference_resolution",
    input_type=CoreferenceResolutionJobInput,
    device="api",
    enricher=enrich_for_recompute,
)
def handle_coreference_resolution_job(
    payload: CoreferenceResolutionJobInput, job: Job
) -> None:
    # 1. find the clusters with ray; a document without model input has none
    text = payload.text
    clusters = [] if text is None else _predict_clusters(payload, text)

    # 2. replace the mentions and their groups, so a document that is no longer
    # a German text keeps none of an earlier run
    with sqlr.transaction() as db:
        store = COREFERENCES.store
        if text is None:
            store.clear(db=db, project_id=payload.project_id, sdoc_id=payload.sdoc_id)
            return
        mention_id = store.code_ids(db=db, project_id=payload.project_id)["MENTION"]
        adoc_id = store.annotation_document_id(db=db, sdoc_id=payload.sdoc_id)
        store.replace_groups(
            db=db,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            groups=[
                [
                    _mention_span(payload, text, adoc_id, mention_id, start, end)
                    for start, end in cluster
                ]
                for cluster in clusters
            ],
        )


def _predict_clusters(
    payload: CoreferenceResolutionJobInput, text: CorefText
) -> list[list[tuple[int, int]]]:
    """The clusters of the document: lists of mentions, each from its first to
    its last token (both inclusive)."""
    output = ray.coref_prediction(
        CorefJobInput(
            id=payload.sdoc_id,
            project_id=payload.project_id,
            language=COREF_LANGUAGE,
            documents=[
                CorefInputDoc(id=payload.sdoc_id, tokens=text.tokenized_sentences)
            ],
        )
    )
    return [cluster for doc in output.documents for cluster in doc.clusters]


def _mention_span(
    payload: CoreferenceResolutionJobInput,
    text: CorefText,
    adoc_id: int,
    code_id: int,
    start: int,
    end: int,
) -> SpanAnnotationCreateIntern:
    """The span of a mention from its first to its last token (both inclusive)."""
    begin_char = text.token_character_offsets[start][0]
    end_char = text.token_character_offsets[end][1]
    return SpanAnnotationCreateIntern(
        project_id=payload.project_id,
        uuid=str(uuid4()),
        begin_token=start,
        end_token=end + 1,
        begin=begin_char,
        end=end_char,
        span_text=text.content[begin_char:end_char],
        code_id=code_id,
        annotation_document_id=adoc_id,
    )
