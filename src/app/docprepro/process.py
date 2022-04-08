from collections import Counter

import spacy
import torch
from fastapi import UploadFile
from langdetect import detect_langs
from loguru import logger
from spacy.tokens import Doc

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentRead, AnnotationDocumentCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.autospan import AutoSpan
from app.docprepro.celery.app import celery_app
from app.docprepro.preprodoc import PreProDoc
from config import conf

# TODO Flo: maybe we want to break all process tasks up in smaller functions for better readability and modularity...
#  However, this would be _little_ less efficient

nlp = {
    "de": spacy.load(conf.docprepro.spacy.german_model),
    "en": spacy.load(conf.docprepro.spacy.english_model)
}

# https://github.com/explosion/spaCy/issues/8678
torch.set_num_threads(1)

if conf.docprepro.spacy.default_model == conf.docprepro.spacy.english_model:
    nlp["default"] = nlp["en"]
elif conf.docprepro.spacy.default_model == conf.docprepro.spacy.german_model:
    nlp["default"] = nlp["de"]
else:
    nlp["default"] = spacy.load(conf.docprepro.spacy.default_model)

sql = SQLService(echo=False)
repo = RepoService()


@celery_app.task(acks_late=True)
def import_uploaded_document(doc_file: UploadFile,
                             project_id: int) -> PreProDoc:
    global sql
    global repo

    # save the file to disk
    dst, create_dto = repo.store_uploaded_document(doc_file=doc_file,
                                                   project_id=project_id)

    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    # detect the language in SourceDocumentMetadata
    doc_lang = detect_langs(create_dto.content)[0].lang  # TODO Flo: what to do with mixed lang docs?
    sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="language",
                                                        value=doc_lang,
                                                        source_document_id=sdoc_db_obj.id)

    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        sdoc_meta_db_obj = crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

    # create PreProDoc
    ppd = PreProDoc(project_id=project_id,
                    sdoc_id=sdoc_db_obj.id,
                    raw_text=sdoc_db_obj.content)
    ppd.metadata[sdoc_meta_db_obj.key] = sdoc_meta_db_obj.value

    return ppd


@celery_app.task(acks_late=True)
def generate_automatic_annotations(ppd: PreProDoc) -> PreProDoc:
    global nlp
    model = nlp[ppd.metadata["language"]] if ppd.metadata["language"] in nlp else nlp["default"]

    doc: Doc = model(ppd.raw_text)

    # add tokens, lemma, POS, and stopword; count word frequencies
    # TODO Flo: Do we want these as Codes/AutoSpans ?
    ppd.word_freqs = Counter()
    for token in doc:
        ppd.tokens.append(token.text)
        ppd.pos.append(token.pos_)
        ppd.lemmas.append(token.lemma_)
        ppd.stopwords.append(token.is_stop)

        if not (token.is_stop or token.is_punct) and (token.is_alpha or token.is_digit):
            ppd.word_freqs.update((token.text,))

    # create AutoSpans for NER
    ppd.spans["NER"] = list()
    for ne in doc.ents:
        auto = AutoSpan(type=f"{ne.label_}",
                        start=ne.start_char,
                        end=ne.end_char)
        ppd.spans["NER"].append(auto)

    # create AutoSpans for Sentences
    ppd.spans["SENTENCE"] = list()
    for s in doc.sents:
        auto = AutoSpan(type=f"SENTENCE",
                        start=s.start_char,
                        end=s.end_char)
        ppd.spans["SENTENCE"].append(auto)

    return ppd


@celery_app.task(acks_late=True)
def persist_automatic_annotations(ppd: PreProDoc) -> AnnotationDocumentRead:
    # create AnnoDoc for system user
    with SQLService().db_session() as db:
        adoc_create = AnnotationDocumentCreate(source_document_id=ppd.sdoc_id,
                                               user_id=SYSTEM_USER_ID)

        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
        adoc_read = AnnotationDocumentRead.from_orm(adoc_db)

        # convert AutoSpans to SpanAnnotations
        for code in ppd.spans.keys():
            for aspan in ppd.spans[code]:
                # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
                if aspan.type == "PER":
                    aspan.type = "PERSON"
                db_code = crud_code.read_by_name_and_user_and_project(db,
                                                                      code_name=aspan.type,
                                                                      user_id=SYSTEM_USER_ID,
                                                                      proj_id=ppd.project_id)

                if not db_code:
                    # FIXME FLO: create code on the fly for system user?
                    logger.warning(f"No Code <{aspan.type}> found! Skipping persistence of SpanAnnotation ...")
                    continue

                ccid = db_code.current_code.id

                create_dto = SpanAnnotationCreate(begin=aspan.start,
                                                  end=aspan.end,
                                                  current_code_id=ccid,
                                                  annotation_document_id=adoc_db.id)

                crud_span_anno.create(db, create_dto=create_dto)

        # Flo: persist word frequencies
        sorted_word_freqs = {k: v for (k, v) in sorted(ppd.word_freqs.items(),
                                                       key=lambda i: i[1],
                                                       reverse=True)}
        sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="word_frequencies",
                                                            value=str(sorted_word_freqs),
                                                            source_document_id=ppd.sdoc_id)
        sdoc_meta_db_obj = crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

    return adoc_read
