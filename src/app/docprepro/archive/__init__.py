from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature
from fastapi import UploadFile

from app.docprepro.image import PreProImageDoc, generate_automatic_bbox_annotations, persist_automatic_bbox_annotations
from app.docprepro.text import generate_automatic_span_annotations, persist_automatic_span_annotations, \
    add_document_to_elasticsearch_index
from app.docprepro.text.preprotextdoc import PreProTextDoc

import_uploaded_archive_document = "app.docprepro.archive.preprocess.import_uploaded_archive"


def import_uploaded_archive_apply_async(archive_file: UploadFile,
                                        project_id: int) -> Any:
    archive_preprocessing = (
        Signature(import_uploaded_archive_document, kwargs={"archive_file": archive_file, "project_id": project_id})
    )
    return archive_preprocessing.apply_async()


def preprotextdoc_multi_apply_async(pptds: List[PreProTextDoc]) -> Any:
    text_document_preprocessing = (
            Signature(generate_automatic_span_annotations, kwargs={"pptds": pptds}) |
            Signature(persist_automatic_span_annotations) |
            Signature(add_document_to_elasticsearch_index)
    )
    return text_document_preprocessing.apply_async()


def preproimagedoc_multi_apply_async(ppids: List[PreProImageDoc]) -> Any:
    text_document_preprocessing = (
            Signature(generate_automatic_bbox_annotations, kwargs={"ppids": ppids}) |
            Signature(persist_automatic_bbox_annotations)
    )
    return text_document_preprocessing.apply_async()
