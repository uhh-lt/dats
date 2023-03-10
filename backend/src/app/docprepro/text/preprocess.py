from pathlib import Path
from typing import List

import torch

from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.text import PreProTextDoc
from app.docprepro.text.add_custom_html_tags import add_custom_html_tags_
from app.docprepro.text.clean_html import clean_html_
from app.docprepro.text.create_sdoc_links_from_html import create_sdoc_links_from_html_
from app.docprepro.text.detect_language import detect_language_
from app.docprepro.text.extract_text_from_html_and_create_source_mapping import (
    extract_text_from_html_and_create_source_mapping_,
)
from app.docprepro.text.finish_preprocessing import finish_preprocessing_
from app.docprepro.text.generate_span_annotations import generate_span_annotations_
from app.docprepro.text.import_text_document import import_text_document_
from app.docprepro.text.resolve_sdoc_links import resolve_sdoc_links_
from app.docprepro.text.store_document_in_elasticsearch import (
    store_document_in_elasticsearch_,
)
from app.docprepro.text.store_metadata_in_db import store_metadata_in_db_
from app.docprepro.text.store_span_annotations_in_db import (
    store_span_annotations_in_db_,
)

# https://github.com/explosion/spaCy/issues/8678
torch.set_num_threads(1)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def add_custom_html_tags(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return add_custom_html_tags_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def clean_html(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return clean_html_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def create_sdoc_links_from_html(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return create_sdoc_links_from_html_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def detect_language(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return detect_language_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def extract_text_from_html_and_create_source_mapping(
    pptds: List[PreProTextDoc],
) -> List[PreProTextDoc]:
    return extract_text_from_html_and_create_source_mapping_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def finish_preprocessing(pptds: List[PreProTextDoc]) -> None:
    return finish_preprocessing_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def generate_span_annotations(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return generate_span_annotations_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_text_document(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProTextDoc]:
    return import_text_document_(doc_file_path, project_id, mime_type)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def resolve_sdoc_links(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return resolve_sdoc_links_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def store_span_annotations_in_db(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return store_span_annotations_in_db_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def store_document_in_elasticsearch(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return store_document_in_elasticsearch_(pptds)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def store_metadata_in_db(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    return store_metadata_in_db_(pptds)
