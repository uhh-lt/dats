import json
from typing import List, Dict

import spacy
import torch
from fastapi import UploadFile
from loguru import logger
from spacy import Language

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentRead, AnnotationDocumentCreate
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.search import ElasticSearchDocumentCreate, ElasticSearchIntegerRange
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.celery.celery_worker import celery_prepro_worker
from app.docprepro.text.preprotextdoc import PreProTextDoc
from app.docprepro.text.util import generate_preprotextdoc, generate_automatic_span_annotations_sequentially, \
    generate_automatic_span_annotations_pipeline
from app.docprepro.util import persist_as_sdoc
from config import conf

SPACY_PIPE_THRESHOLD = conf.docprepro.text.spacy.pipe_threshold

# TODO Flo: maybe we want to break all process tasks up in smaller functions for better readability and modularity...
#  However, this would be _little_ less efficient

nlp: Dict[str, Language] = {
    "de": spacy.load(conf.docprepro.text.spacy.german_model),
    "en": spacy.load(conf.docprepro.text.spacy.english_model)
}

# https://github.com/explosion/spaCy/issues/8678
torch.set_num_threads(1)

if conf.docprepro.text.spacy.default_model == conf.docprepro.text.spacy.english_model:
    nlp["default"] = nlp["en"]
elif conf.docprepro.text.spacy.default_model == conf.docprepro.text.spacy.german_model:
    nlp["default"] = nlp["de"]
else:
    nlp["default"] = spacy.load(conf.docprepro.text.spacy.default_model)

sql = SQLService(echo=False)
repo = RepoService()
es = ElasticSearchService()


@celery_prepro_worker.task(acks_late=True)
def import_uploaded_text_document(doc_file: UploadFile,
                                  project_id: int) -> List[PreProTextDoc]:
    dst, sdoc_db_obj = persist_as_sdoc(doc_file, project_id)
    pptd = generate_preprotextdoc(filepath=dst, sdoc_db_obj=sdoc_db_obj)
    # Flo: We return a list here so that we can use text PrePro also with archives which contain multiple docs
    return [pptd]


@celery_prepro_worker.task(acks_late=True)
def generate_automatic_span_annotations(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    global nlp

    if len(pptds) < SPACY_PIPE_THRESHOLD:
        return generate_automatic_span_annotations_sequentially(pptds, nlp=nlp)
    return generate_automatic_span_annotations_pipeline(pptds, nlp=nlp)


@celery_prepro_worker.task(acks_late=True)
def persist_automatic_span_annotations(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    for pptd in pptds:
        # create AnnoDoc for system user
        with SQLService().db_session() as db:
            adoc_create = AnnotationDocumentCreate(source_document_id=pptd.sdoc_id,
                                                   user_id=SYSTEM_USER_ID)

            adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
            adoc_read = AnnotationDocumentRead.from_orm(adoc_db)

            # convert AutoSpans to SpanAnnotations
            for code in pptd.spans.keys():
                for aspan in pptd.spans[code]:
                    # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
                    if aspan.code == "PER":
                        aspan.code = "PERSON"
                    db_code = crud_code.read_by_name_and_user_and_project(db,
                                                                          code_name=aspan.code,
                                                                          user_id=SYSTEM_USER_ID,
                                                                          proj_id=pptd.project_id)

                    if not db_code:
                        # FIXME FLO: create code on the fly for system user?
                        logger.warning(f"No Code <{aspan.code}> found! Skipping persistence of SpanAnnotation ...")
                        continue

                    ccid = db_code.current_code.id

                    create_dto = SpanAnnotationCreate(begin=aspan.start,
                                                      end=aspan.end,
                                                      current_code_id=ccid,
                                                      annotation_document_id=adoc_db.id,
                                                      span_text=aspan.text)

                    crud_span_anno.create(db, create_dto=create_dto)

            # persist word frequencies
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="word_frequencies",
                                                                value=json.dumps(pptd.word_freqs).replace("\"", "'"),
                                                                source_document_id=pptd.sdoc_id,
                                                                read_only=True)
            sdoc_meta_db_obj = crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

    return pptds


@celery_prepro_worker.task(acks_late=True)
def add_document_to_elasticsearch_index(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    for pptd in pptds:
        with SQLService().db_session() as db:
            proj = ProjectRead.from_orm(crud_project.read(db=db, id=pptd.project_id))

        esdoc = ElasticSearchDocumentCreate(filename=pptd.filename,
                                            content=pptd.raw_text,
                                            tokens=pptd.tokens,
                                            token_character_offsets=[ElasticSearchIntegerRange(gte=o[0], lt=o[1])
                                                                     for o in pptd.token_character_offsets],
                                            keywords=pptd.keywords,
                                            sdoc_id=pptd.sdoc_id,
                                            project_id=pptd.project_id)

        es.add_document_to_index(proj=proj, esdoc=esdoc)

    return pptds
