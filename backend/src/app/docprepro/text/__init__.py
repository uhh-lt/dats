from pathlib import Path
from typing import Any, List

from app.docprepro.simsearch import index_text_document_in_faiss
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.core.data.dto.preprocessing_job import PreprocessingJobPayload

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

import_text_document = "app.docprepro.text.preprocess.import_text_document"

clean_html = "app.docprepro.text.preprocess.clean_html"
extract_text_from_html_and_create_source_mapping = (
    "app.docprepro.text.preprocess.extract_text_from_html_and_create_source_mapping"
)

detect_language = "app.docprepro.text.preprocess.detect_language"
generate_span_annotations = "app.docprepro.text.preprocess.generate_span_annotations"

add_custom_html_tags = "app.docprepro.text.preprocess.add_custom_html_tags"
create_sdoc_links_from_html = (
    "app.docprepro.text.preprocess.create_sdoc_links_from_html"
)
resolve_sdoc_links = "app.docprepro.text.preprocess.resolve_sdoc_links"

store_metadata_in_db = "app.docprepro.text.preprocess.store_metadata_in_db"
store_span_annotations_in_db = (
    "app.docprepro.text.preprocess.store_span_annotations_in_db"
)
store_document_in_elasticsearch = (
    "app.docprepro.text.preprocess.store_document_in_elasticsearch"
)

finish_preprocessing = "app.docprepro.text.preprocess.finish_preprocessing"


def text_document_preprocessing_apply_async(payload: PreprocessingJobPayload) -> Any:
    text_document_preprocessing = (
        # import document
        Signature(
            import_text_document,
            kwargs={
                "payload": payload,
            },
        )
        |
        # clean input
        Signature(clean_html)
        | Signature(extract_text_from_html_and_create_source_mapping)
        |
        # do stuff with text
        Signature(detect_language)
        | Signature(generate_span_annotations)
        |
        # do stuff with html
        Signature(create_sdoc_links_from_html)
        | Signature(add_custom_html_tags)
        |
        # save to dbs
        Signature(store_metadata_in_db)
        | Signature(store_span_annotations_in_db)
        | Signature(store_document_in_elasticsearch)
        | Signature(index_text_document_in_faiss)
        |
        # finish
        Signature(resolve_sdoc_links)
        | Signature(finish_preprocessing)
    )
    return text_document_preprocessing.apply_async()


def text_document_preprocessing_without_import_apply_async(
    pptds: List[PreProTextDoc],
) -> Any:
    text_document_preprocessing = (
        # clean input
        Signature(clean_html, kwargs={"pptds": pptds})
        | Signature(extract_text_from_html_and_create_source_mapping)
        |
        # do stuff with text
        Signature(detect_language)
        | Signature(generate_span_annotations)
        |
        # do stuff with html
        Signature(add_custom_html_tags)
        | Signature(create_sdoc_links_from_html)
        |
        # save to dbs
        Signature(store_metadata_in_db)
        | Signature(store_span_annotations_in_db)
        | Signature(store_document_in_elasticsearch)
        | Signature(index_text_document_in_faiss)
        |
        # finish
        Signature(resolve_sdoc_links)
        | Signature(finish_preprocessing)
    )
    return text_document_preprocessing.apply_async()
