from typing import Counter
from uuid import uuid4

import yake

from common.doc_type import DocType
from common.job_type import JobType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import (
    SourceDocumentDataCreate,
    SourceDocumentDataUpdate,
)
from core.doc.source_document_dto import SourceDocumentRead
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.user.user_crud import SYSTEM_USER_ID
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from repos.db.crud_base import NoSuchElementError
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
ray = RayRepo()


class SpacyJobInput(SdocProcessingJobInput):
    # everything below is queryable:
    doctype: DocType
    text: str
    language: str
    html: str


class SpacyJobOutput(JobOutputBase):
    sentence_starts: list[int]
    sentence_ends: list[int]
    token_starts: list[int]
    token_ends: list[int]
    sentences: list[str]


@register_job(
    job_type=JobType.TEXT_SPACY,
    input_type=SpacyJobInput,
    output_type=SpacyJobOutput,
)
def handle_text_spacy_job(payload: SpacyJobInput, job: Job) -> SpacyJobOutput:
    # 1. call spacy in ray
    spacy_output = ray.spacy_pipline(
        SpacyInput(
            text=payload.text,
            language=payload.language,
        )
    )

    with sqlr.transaction() as trans:
        # query required data from db
        system_code_ids = {
            code.name: code.id
            for code in crud_code.read_system_codes_by_project(
                db=trans, proj_id=payload.project_id
            )
        }
        adoc = crud_adoc.exists_or_create(
            db=trans,
            user_id=SYSTEM_USER_ID,
            sdoc_id=payload.sdoc_id,
            manual_commit=True,
        )

        # tokens & offsets & sentences
        sdoc_data = extract_tok_sent_data(spacy_output)

        # keywords
        # if payload does not have keywords:
        keywords = extract_keywords(payload, spacy_output)

        # word frequencies
        word_frequencies = extract_word_frequencies(payload, spacy_output)

        # span annotations
        span_annotations = extract_span_annotations(
            payload, spacy_output, system_code_ids, adoc.id
        )

        # store outputs in db
        crud_sdoc_meta.create_multi_with_doctype(
            db=trans,
            project_id=payload.project_id,
            sdoc_id=payload.sdoc_id,
            doctype=payload.doctype,
            keys=["keywords"],
            values=[keywords],
            manual_commit=True,
        )
        crud_word_frequency.create_multi(
            db=trans, create_dtos=word_frequencies, manual_commit=True
        )
        crud_span_anno.create_multi(
            trans, create_dtos=span_annotations, manual_commit=True
        )

        # it is possible that sdoc data already exists (if coming from audio or video pipeline)
        # in this case, we are only interested in sentence splitting (tokenization already done by whisper)
        try:
            existing_sdoc_data = crud_sdoc_data.read(db=trans, id=payload.sdoc_id)
            sdoc_data = {
                "token_starts": existing_sdoc_data.token_starts,
                "token_ends": existing_sdoc_data.token_ends,
                "sentence_starts": sdoc_data["sentence_starts"],
                "sentence_ends": sdoc_data["sentence_ends"],
            }
        except NoSuchElementError:
            existing_sdoc_data = None

        if existing_sdoc_data is None:
            sdoc = crud_sdoc.read(trans, payload.sdoc_id)
            url = FilesystemRepo().get_sdoc_url(
                sdoc=SourceDocumentRead.model_validate(sdoc),
                relative=True,
                webp=sdoc.doctype == DocType.image,
                thumbnail=False,
            )
            crud_sdoc_data.create(
                db=trans,
                create_dto=SourceDocumentDataCreate(
                    id=payload.sdoc_id,
                    repo_url=url,
                    content=payload.text,
                    html=payload.html,
                    token_starts=sdoc_data["token_starts"],
                    token_ends=sdoc_data["token_ends"],
                    sentence_starts=sdoc_data["sentence_starts"],
                    sentence_ends=sdoc_data["sentence_ends"],
                ),
                manual_commit=True,
            )
        else:
            crud_sdoc_data.update(
                db=trans,
                id=payload.sdoc_id,
                update_dto=SourceDocumentDataUpdate(
                    sentence_starts=sdoc_data["sentence_starts"],
                    sentence_ends=sdoc_data["sentence_ends"],
                ),
                manual_commit=True,
            )

    return SpacyJobOutput(
        sentence_starts=sdoc_data["sentence_starts"],
        sentence_ends=sdoc_data["sentence_ends"],
        token_starts=sdoc_data["token_starts"],
        token_ends=sdoc_data["token_ends"],
        sentences=[
            payload.text[s:e]
            for s, e in zip(sdoc_data["sentence_starts"], sdoc_data["sentence_ends"])
        ],
    )


def extract_keywords(
    payload: SpacyJobInput,
    spacy_output: SpacyPipelineOutput,
) -> list[str]:
    kw_extractor = yake.KeywordExtractor(
        lan=payload.language,
        n=payload.settings.keyword_max_ngram_size,
        dedupLim=payload.settings.keyword_deduplication_threshold,
        windowsSize=1,
        top=payload.settings.keyword_number,
    )
    keyword_proposals = kw_extractor.extract_keywords(payload.text)
    keyword_proposals = [kw for kw, _ in keyword_proposals]

    # Part of speech filtering for keywords, is this really necessary?
    # tok2pos = {tok.text: tok.pos for tok in spacy_output.tokens}
    # # pos_to_keep = [
    # #     "NOUN",
    # #     "PROPN",
    # #     "ADJ",
    # #     "VERB",
    # # ]
    # # keywords = []
    # # for kp in keyword_proposals:
    # #     ws = kp.split()
    # #     keep_kp = True
    # #     for w in ws:
    # #         if tok2pos[w] not in pos_to_keep:
    # #             keep_kp = False
    # #             break
    # #     if keep_kp:
    # #         keywords.append(kp)

    return keyword_proposals


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
) -> dict:
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

    return {
        "token_starts": token_starts,
        "token_ends": token_ends,
        "sentence_starts": sentence_starts,
        "sentence_ends": sentence_ends,
    }


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
