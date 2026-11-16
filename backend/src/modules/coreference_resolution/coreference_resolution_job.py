from uuid import uuid4

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc_processing.artefacts import LANGUAGE, TOKENS_SENTENCES
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


class CoreferenceResolutionJobInput(SdocProcessingJobInput):
    doctype: DocType
    language: str
    content: str
    tokenized_sentences: list[list[str]]
    token_character_offsets: list[tuple[int, int]]


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> CoreferenceResolutionJobInput:
    with sqlr.transaction() as db:
        sdoc_data = crud_sdoc_data.read(db=db, id=payload.sdoc_id)
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, key="language", sdoc_id=payload.sdoc_id
        )
        assert language.str_value is not None, (
            "Language must be set for the coreference resolution!"
        )

        return CoreferenceResolutionJobInput(
            **payload.model_dump(),
            doctype=DocType(sdoc_data.source_document.doctype),
            language=language.str_value,
            content=sdoc_data.content,
            tokenized_sentences=sdoc_data.tokenized_sentences,
            token_character_offsets=sdoc_data.token_character_offsets,
        )


@pipeline_step(
    requires={TOKENS_SENTENCES, LANGUAGE},
    produces={COREFERENCES},
    # the doctypes of text_spacy, which the step follows; it computes text only
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
    # text documents only, and the model supports German only: other documents
    # finish without output (delete the doctype check to also resolve the German
    # transcripts and captions)
    if payload.doctype != DocType.text or payload.language != COREF_LANGUAGE:
        return

    # 1. find the clusters with ray
    output = ray.coref_prediction(
        CorefJobInput(
            id=payload.sdoc_id,
            project_id=payload.project_id,
            language=COREF_LANGUAGE,
            documents=[
                CorefInputDoc(id=payload.sdoc_id, tokens=payload.tokenized_sentences)
            ],
        )
    )
    clusters = [cluster for doc in output.documents for cluster in doc.clusters]

    # 2. replace the mentions and their groups
    with sqlr.transaction() as db:
        mention = crud_code.read_by_name_and_project(
            db=db, code_name="MENTION", project_id=payload.project_id
        )
        assert mention is not None, (
            f"Project {payload.project_id} has no code MENTION: the set up of the "
            "coreference artefact did not run!"
        )
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=payload.sdoc_id
        )
        SpanGroupService().replace_groups(
            db=db,
            annotation_document_id=adoc.id,
            name=COREF_GROUP_NAME,
            code_ids=[mention.id],
            groups=[
                [
                    _mention_span(payload, adoc.id, mention.id, start, end)
                    for start, end in cluster
                ]
                for cluster in clusters
            ],
        )


def _mention_span(
    payload: CoreferenceResolutionJobInput,
    adoc_id: int,
    code_id: int,
    start: int,
    end: int,
) -> SpanAnnotationCreateIntern:
    """The span of a mention from its first to its last token (both inclusive)."""
    begin_char = payload.token_character_offsets[start][0]
    end_char = payload.token_character_offsets[end][1]
    return SpanAnnotationCreateIntern(
        project_id=payload.project_id,
        uuid=str(uuid4()),
        begin_token=start,
        end_token=end + 1,
        begin=begin_char,
        end=end_char,
        span_text=payload.content[begin_char:end_char],
        code_id=code_id,
        annotation_document_id=adoc_id,
    )
