from typing import Any

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature
from fastapi import UploadFile

# Flo: Task names (as they could be imported)
import_uploaded_text_document = "app.docprepro.text.preprocess.import_uploaded_text_document"
generate_automatic_span_annotations = "app.docprepro.text.preprocess.generate_automatic_span_annotations"
persist_automatic_span_annotations = "app.docprepro.text.preprocess.persist_automatic_span_annotations"


def text_document_preprocessing_apply_async(doc_file: UploadFile, project_id: int) -> Any:
    text_document_preprocessing = (
            Signature(import_uploaded_text_document, kwargs={"doc_file": doc_file, "project_id": project_id}) |
            Signature(generate_automatic_span_annotations) |
            Signature(persist_automatic_span_annotations)
    )
    return text_document_preprocessing.apply_async()
