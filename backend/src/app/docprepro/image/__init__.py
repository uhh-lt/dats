from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.docprepro.image.preproimagedoc import PreProImageDoc
from app.docprepro.simsearch import index_image_document
from app.docprepro.text import generate_automatic_span_annotations, \
    persist_automatic_span_annotations, add_document_to_elasticsearch_index, finish_preprocessing

# Flo: Task names (as they could be imported)
import_uploaded_image_document = "app.docprepro.image.preprocess.import_uploaded_image_document"
generate_automatic_bbox_annotations = "app.docprepro.image.preprocess.generate_automatic_bbox_annotations"
generate_automatic_image_captions = "app.docprepro.image.preprocess.generate_automatic_image_captions"
persist_automatic_bbox_annotations = "app.docprepro.image.preprocess.persist_automatic_bbox_annotations"
create_pptds_from_automatic_caption = "app.docprepro.image.preprocess.create_pptds_from_automatic_caption"


def image_document_preprocessing_apply_async(doc_file_path: Path, project_id: int) -> Any:
    image_document_preprocessing = (
            Signature(import_uploaded_image_document, kwargs={"doc_file_path": doc_file_path,
                                                              "project_id": project_id}) |
            Signature(generate_automatic_bbox_annotations) |
            Signature(generate_automatic_image_captions) |
            Signature(persist_automatic_bbox_annotations) |
            Signature(index_image_document) |
            # Flo: the following calls are to generate and store automatically generated textual info as in text docs
            Signature(create_pptds_from_automatic_caption) |
            Signature(generate_automatic_span_annotations) |
            Signature(persist_automatic_span_annotations) |
            Signature(add_document_to_elasticsearch_index) |
            Signature(finish_preprocessing)
    )
    return image_document_preprocessing.apply_async()


def image_document_preprocessing_without_import_apply_async(ppids: List[PreProImageDoc]) -> Any:
    image_document_preprocessing = (
            Signature(generate_automatic_bbox_annotations, kwargs={"ppids": ppids}) |
            Signature(generate_automatic_image_captions) |
            Signature(persist_automatic_bbox_annotations) |
            Signature(index_image_document) |
            # Flo: the following calls are to generate and store automatically generated textual info as in text docs
            Signature(create_pptds_from_automatic_caption) |
            Signature(generate_automatic_span_annotations) |
            Signature(persist_automatic_span_annotations) |
            Signature(add_document_to_elasticsearch_index) |
            Signature(finish_preprocessing)
    )
    return image_document_preprocessing.apply_async()
