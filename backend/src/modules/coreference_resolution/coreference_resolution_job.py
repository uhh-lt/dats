from uuid import uuid4

from pydantic import BaseModel

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_service import SpanGroupService
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.tokens_sentences.tokens_sentences_artefact import (
    TOKENS_SENTENCES,
)
from core.code.code_crud import crud_code
from core.doc.source_document_data_crud import crud_sdoc_data
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.user.user_crud import SYSTEM_USER_ID
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
# the name of the span groups, one per cluster
COREF_GROUP_NAME = "coref"


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
        sdoc_data = crud_sdoc_data.read(
            db=db, project_id=payload.project_id, id=payload.sdoc_id
        )
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, key="language", sdoc_id=payload.sdoc_id
        )

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
        mention = crud_code.read_by_name_and_project(
            db=db, code_name="MENTION", project_id=payload.project_id
        )
        assert mention is not None, (
            f"Project {payload.project_id} has no code MENTION: the set up of the "
            "coreference artefact did not run!"
        )
        if text is None:
            # without an annotation document of the system user there is nothing
            # to clear, and none is created
            adocs = crud_adoc.read_by_user_and_sdocs(
                db=db,
                project_id=payload.project_id,
                user_id=SYSTEM_USER_ID,
                sdoc_ids=[payload.sdoc_id],
            )
            if not adocs:
                return
            adoc_id = adocs[0].id
            groups = []
        else:
            adoc_id = crud_adoc.exists_or_create(
                db=db,
                project_id=payload.project_id,
                user_id=SYSTEM_USER_ID,
                sdoc_id=payload.sdoc_id,
            ).id
            groups = [
                [
                    _mention_span(text, adoc_id, mention.id, start, end)
                    for start, end in cluster
                ]
                for cluster in clusters
            ]
        SpanGroupService().replace_groups(
            db=db,
            project_id=payload.project_id,
            annotation_document_id=adoc_id,
            name=COREF_GROUP_NAME,
            code_ids=[mention.id],
            groups=groups,
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
        uuid=str(uuid4()),
        begin_token=start,
        end_token=end + 1,
        begin=begin_char,
        end=end_char,
        span_text=text.content[begin_char:end_char],
        code_id=code_id,
        annotation_document_id=adoc_id,
    )
