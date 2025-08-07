from typing import Counter
from uuid import uuid4

import yake
from common.doc_type import DocType
from common.meta_type import MetaType
from config import conf
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.code.code_crud import crud_code
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataCreate
from core.user.user_crud import SYSTEM_USER_ID
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.db.sql_repo import SQLRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class SpacyJobInput(JobInputBase):
    sdoc_id: int
    # everything below is queryable:
    doctype: DocType
    text: str
    language: str


@register_job(
    job_type="spacy",
    input_type=SpacyJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_spacy_job(payload: SpacyJobInput, job: Job) -> None:
    # 1. call spacy in ray
    spacy_output = ray.spacy_pipline(
        SpacyInput(
            text=payload.text,
            language=payload.language,
        )
    )

    with sqlr.db_session() as db:
        # query required data from db
        system_code_ids = {
            code.name: code.id
            for code in crud_code.read_system_codes_by_project(
                db=db, proj_id=payload.project_id
            )
        }
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=payload.sdoc_id
        )
        keyword_project_metadata = (
            crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                db=db,
                project_id=payload.project_id,
                key="keywords",
                metatype=MetaType.LIST,
                doctype=payload.doctype,
            )
        )
        assert keyword_project_metadata is not None, "Keyword metadata does not exist!"

        # tokens & offsets & sentences
        sdoc_data = extract_tok_sent_data(spacy_output)

        # keywords
        # if payload does not have keywords:
        keywords = extract_keywords(payload, spacy_output, keyword_project_metadata.id)

        # word frequencies
        word_frequencies = extract_word_frequencies(payload, spacy_output)

        # span annotations
        span_annotations = extract_span_annotations(
            payload, spacy_output, system_code_ids, adoc.id
        )

        # store outputs in db
        crud_sdoc_meta.create(db=db, create_dto=keywords)
        crud_word_frequency.create_multi(db=db, create_dtos=word_frequencies)
        crud_span_anno.create_multi(db, create_dtos=span_annotations)
        crud_sdoc_data.update(db=db, id=payload.sdoc_id, update_dto=sdoc_data)
        crud_sdoc_status.update(
            db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentStatusUpdate(spacy=True),
        )


def extract_keywords(
    payload: SpacyJobInput,
    spacy_output: SpacyPipelineOutput,
    keyword_project_metadata_id: int,
) -> SourceDocumentMetadataCreate:
    kw_extractor = yake.KeywordExtractor(
        lan=payload.language,
        n=conf.keyword_extraction.max_ngram_size,
        dedupLim=conf.keyword_extraction.deduplication_threshold,
        top=conf.keyword_extraction.keyword_proposals,
    )
    keyword_proposals = kw_extractor.extract_keywords(payload.text)
    keyword_proposals = [kw for kw, _ in keyword_proposals]

    tok2pos = {tok.text: tok.pos for tok in spacy_output.tokens}

    keep = [
        "NOUN",
        "PROPN",
        #
        ["NOUN", "NOUN"],
        ["PROPN", "PROPN"],
        ["PROPN", "NOUN"],
        ["NOUN", "PROPN"],
        #
        ["ADJ", "NOUN"],
        ["ADJ", "PROPN"],
        #
        ["NOUN", "VERB"],
        ["PROPN", "VERB"],
        ["VERB", "NOUN"],
        ["VERB", "PROPN"],
    ]
    keywords = []
    for kp in keyword_proposals:
        try:
            ws = kp.split()
            if len(ws) == 1:
                if tok2pos[ws[0]] in keep:
                    keywords.append(kp)
            elif len(ws) == 2:
                if [tok2pos[w] for w in ws] in keep:
                    keywords.append(kp)
                elif tok2pos[ws[0]] in keep and tok2pos[ws[1]] == "ADJ":
                    keywords.append(ws[0])
        except Exception as e:  # noqa
            # if any of the words is not in the pos dict, we skip the keyword
            pass

    return SourceDocumentMetadataCreate.with_metatype(
        value=keywords,
        source_document_id=payload.sdoc_id,
        project_metadata_id=keyword_project_metadata_id,
        metatype=MetaType.LIST,
    )


def extract_span_annotations(
    payload: SpacyJobInput,
    spacy_output: SpacyPipelineOutput,
    system_code_ids: dict[str, int],
    adoc_id: int,
) -> list[SpanAnnotationCreateIntern]:
    create_dtos: list[SpanAnnotationCreateIntern] = []
    # create AutoSpans for NER
    for ne in spacy_output.ents:
        # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
        code_name = f"{ne.label}"
        if code_name == "PER":
            code_name = "PERSON"

        auto = SpanAnnotationCreateIntern(
            begin=ne.start_char,
            begin_token=ne.start_token,
            project_id=payload.project_id,
            uuid=str(uuid4()),
            code_id=system_code_ids[code_name],
            annotation_document_id=adoc_id,
            end=ne.end_char,
            span_text=ne.text,
            end_token=ne.end_token,
        )
        create_dtos.append(auto)

    return create_dtos


def extract_tok_sent_data(
    spacy_output: SpacyPipelineOutput,
) -> SourceDocumentDataUpdate:
    # FIXME: take tokens/sentences from whisper and store audio token time offsets
    token_starts: list[int] = []
    token_ends: list[int] = []
    for token in spacy_output.tokens:
        token_starts.append(token.start_char)
        token_ends.append(token.end_char)

    sentence_starts: list[int] = []
    sentence_ends: list[int] = []
    for s in spacy_output.sents:
        sentence_starts.append(s.start_char)
        sentence_ends.append(s.end_char)

    return SourceDocumentDataUpdate(
        token_starts=token_starts,
        token_ends=token_ends,
        sentence_starts=sentence_starts,
        sentence_ends=sentence_ends,
    )


def extract_word_frequencies(
    payload: SpacyJobInput, spacy_output: SpacyPipelineOutput
) -> list[WordFrequencyCreate]:
    word_freqs = Counter()
    for token in spacy_output.tokens:
        if not (token.is_stopword or token.is_punctuation) and (
            token.is_alpha or token.is_digit
        ):
            word_freqs.update((token.text,))

    return [
        WordFrequencyCreate(
            sdoc_id=payload.sdoc_id,
            word=word,
            count=count,
        )
        for word, count in word_freqs.items()
    ]
