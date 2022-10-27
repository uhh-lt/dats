from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.docprepro.simsearch import index_text_document
from app.docprepro.text.preprotextdoc import PreProTextDoc

# Flo: Task names (as they could be imported)
import_uploaded_text_document = "app.docprepro.text.preprocess.import_uploaded_text_document"
generate_automatic_span_annotations = "app.docprepro.text.preprocess.generate_automatic_span_annotations"
persist_automatic_span_annotations = "app.docprepro.text.preprocess.persist_automatic_span_annotations"
add_document_to_elasticsearch_index = "app.docprepro.text.preprocess.add_document_to_elasticsearch_index"
finish_preprocessing = "app.docprepro.text.preprocess.finish_preprocessing"


def text_document_preprocessing_apply_async(doc_file_path: Path, project_id: int) -> Any:
    text_document_preprocessing = (
            Signature(import_uploaded_text_document, kwargs={"doc_file_path": doc_file_path,
                                                             "project_id": project_id}) |
            Signature(generate_automatic_span_annotations) |
            Signature(persist_automatic_span_annotations) |
            Signature(add_document_to_elasticsearch_index) |
            Signature(index_text_document) |
            Signature(finish_preprocessing)
    )
    return text_document_preprocessing.apply_async()


def text_document_preprocessing_without_import_apply_async(pptds: List[PreProTextDoc]) -> Any:
    text_document_preprocessing = (
            Signature(generate_automatic_span_annotations, kwargs={"pptds": pptds}) |
            Signature(persist_automatic_span_annotations) |
            Signature(add_document_to_elasticsearch_index) |
            Signature(index_text_document) |
            Signature(finish_preprocessing)
    )
    return text_document_preprocessing.apply_async()
