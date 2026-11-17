from uuid import uuid4

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.code.code_crud import crud_code
from core.doc_processing.content.content_artefact import CONTENT
from core.doc_processing.language.language_artefact import LANGUAGE
from core.doc_processing.text_step_utils import read_stored_text
from core.user.user_crud import SYSTEM_USER_ID
from modules.entity_annotations.ner_artefact import NER_SPANS
from repos.db.sql_repo import SQLRepo
from repos.ray.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()

# the system code whose children are the named entity codes
NAMED_ENTITY_CODE = "NAMED_ENTITY"


class NerJobInput(SdocProcessingJobInput):
    text: str
    language: str


def enrich_for_recompute(payload: SdocProcessingJobInput) -> NerJobInput:
    stored = read_stored_text(payload.sdoc_id)
    return NerJobInput(
        **payload.model_dump(), text=stored.text, language=stored.language
    )


@pipeline_step(
    requires={CONTENT, LANGUAGE},
    produces={NER_SPANS},
    doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
)
@register_job(
    job_type="text_ner",
    input_type=NerJobInput,
    enricher=enrich_for_recompute,
)
def handle_text_ner_job(payload: NerJobInput, job: Job) -> None:
    spacy_output = ray.spacy_pipline(
        SpacyInput(text=payload.text, language=payload.language)
    )
    with sqlr.transaction() as db:
        system_codes = crud_code.read_system_codes_by_project(
            db=db, project_id=payload.project_id
        )
        system_code_ids = {code.name: code.id for code in system_codes}
        # the codes of the named entities spacy annotates
        ner_parent_id = system_code_ids.get(NAMED_ENTITY_CODE)
        ner_code_ids = [
            code.id
            for code in system_codes
            if ner_parent_id is not None and code.parent_id == ner_parent_id
        ]
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=payload.sdoc_id
        )
        # replace only the system user's named entities, keeping the annotations
        # of all users and of other automatic annotators (quotation, coreference)
        crud_span_anno.delete_by_user_sdocs_codes(
            db=db,
            user_id=SYSTEM_USER_ID,
            sdoc_ids=[payload.sdoc_id],
            code_ids=ner_code_ids,
        )
        crud_span_anno.create_multi(
            db,
            create_dtos=extract_span_annotations(
                payload.project_id, spacy_output, system_code_ids, adoc.id
            ),
        )


def extract_span_annotations(
    project_id: int,
    spacy_output: SpacyPipelineOutput,
    system_code_ids: dict[str, int],
    adoc_id: int,
) -> list[SpanAnnotationCreateIntern]:
    create_dtos: list[SpanAnnotationCreateIntern] = []
    for ne in spacy_output.ents:
        # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
        code_name = f"{ne.label}"
        if code_name == "PER":
            code_name = "PERSON"

        create_dtos.append(
            SpanAnnotationCreateIntern(
                begin=ne.start_char,
                begin_token=ne.start_token,
                project_id=project_id,
                uuid=str(uuid4()),
                code_id=system_code_ids[code_name],
                annotation_document_id=adoc_id,
                end=ne.end_char,
                span_text=ne.text,
                end_token=ne.end_token,
            )
        )
    return create_dtos
