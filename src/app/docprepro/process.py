from collections import Counter

import spacy
import torch
from fastapi import UploadFile
from spacy.tokens import Doc

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentRead, AnnotationDocumentCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.autospan import AutoSpan
from app.docprepro.celery.app import celery_app
from app.docprepro.preprodoc import PreProDoc
from config import conf

# https://github.com/explosion/spaCy/issues/8678
torch.set_num_threads(1)
# TODO Flo: language detection -> load lang specific model
nlp = spacy.load(conf.docprepro.spacy.default_model)

sql = SQLService(echo=False)
repo = RepoService()


@celery_app.task(acks_late=True)
def import_uploaded_document(doc_file: UploadFile,
                             project_id: int) -> PreProDoc:
    global sql
    global repo
    # 1) save the file to disk
    dst, create_dto = repo.store_uploaded_document(doc_file=doc_file,
                                                   project_id=project_id)
    # 2) persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    # 3) create PreProDoc
    ppd = PreProDoc(project_id=project_id,
                    sdoc_id=sdoc_db_obj.id,
                    raw_text=sdoc_db_obj.content)

    return ppd


@celery_app.task(acks_late=True)
def generate_automatic_annotations(ppd: PreProDoc) -> PreProDoc:
    global nlp
    doc: Doc = nlp(ppd.raw_text)

    # 1) add tokens, lemma, POS, and stopword
    # TODO Flo: Do we want these as Codes/AutoSpans ?
    for token in doc:
        ppd.tokens.append(token.text)
        ppd.pos.append(token.pos_)
        ppd.lemmas.append(token.lemma_)
        ppd.stopwords.append(token.is_stop)

    # 2) add word frequencies
    ppd.word_freqs = Counter(ppd.tokens)

    # 3) create AutoSpans for NER
    ppd.spans["NER"] = list()
    for ne in doc.ents:
        auto = AutoSpan(type=f"{ne.label_}",
                        start=ne.start_char,
                        end=ne.end_char)
        ppd.spans["NER"].append(auto)

    # 4) create AutoSpans for Sentences
    ppd.spans["SENTENCE"] = list()
    for s in doc.sents:
        auto = AutoSpan(type=f"SENTENCE",
                        start=s.start_char,
                        end=s.end_char)
        ppd.spans["SENTENCE"].append(auto)

    return ppd


@celery_app.task(acks_late=True)
def persist_automatic_annotations(ppd: PreProDoc) -> AnnotationDocumentRead:
    # TODO Flo 1) add to ElasticSearch

    # 2) create AnnoDoc for system user
    with SQLService().db_session() as db:
        adoc_create = AnnotationDocumentCreate(source_document_id=ppd.sdoc_id,
                                               user_id=SYSTEM_USER_ID)

        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
        adoc_read = AnnotationDocumentRead.from_orm(adoc_db)

        # 3) convert AutoSpans to SpanAnnotations
        for code in ppd.spans.keys():
            for aspan in ppd.spans[code]:
                db_code = crud_code.read_by_name_and_user_and_project(db,
                                                                      code_name=aspan.type,
                                                                      user_id=SYSTEM_USER_ID,
                                                                      proj_id=ppd.project_id)

                if not db_code:
                    # FIXME FLO: create code on the fly for system user?
                    pass

                ccid = db_code.current_code.id

                create_dto = SpanAnnotationCreate(begin=aspan.start,
                                                  end=aspan.end,
                                                  current_code_id=ccid,
                                                  annotation_document_id=adoc_db.id)

                crud_span_anno.create(db, create_dto=create_dto)

    return adoc_read
