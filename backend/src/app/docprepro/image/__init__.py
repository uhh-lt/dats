from pathlib import Path
from typing import Any, List

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.simsearch import index_image_document_in_faiss
from app.docprepro.text import store_document_in_elasticsearch, finish_preprocessing, store_span_annotations_in_db, \
    generate_span_annotations

# Flo: Task names (as they could be imported)
import_image_document = "app.docprepro.image.preprocess.import_image_document"
convert_to_webp_and_generate_thumbnails = "app.docprepro.image.preprocess.convert_to_webp_and_generate_thumbnails"
generate_bbox_annotations = "app.docprepro.image.preprocess.generate_bbox_annotations"
generate_image_captions = "app.docprepro.image.preprocess.generate_image_captions"
store_bbox_annotations_in_db = "app.docprepro.image.preprocess.store_bbox_annotations_in_db"
create_pptd_from_caption = "app.docprepro.image.preprocess.create_pptd_from_caption"


def image_document_preprocessing_apply_async(doc_file_path: Path, project_id: int, mime_type: str) -> Any:
    image_document_preprocessing = (
            Signature(import_image_document, kwargs={"doc_file_path": doc_file_path,
                                                     "project_id": project_id,
                                                     "mime_type": mime_type}) |
            Signature(generate_bbox_annotations) |
            Signature(generate_image_captions) |
            Signature(store_bbox_annotations_in_db) |
            Signature(index_image_document_in_faiss) |
            Signature(convert_to_webp_and_generate_thumbnails) |
            # Flo: the following calls are to generate and store automatically generated textual info as in text docs
            Signature(create_pptd_from_caption) |
            Signature(generate_span_annotations) |
            Signature(store_span_annotations_in_db) |
            Signature(store_document_in_elasticsearch) |
            Signature(finish_preprocessing)
    )
    return image_document_preprocessing.apply_async()


def image_document_preprocessing_without_import_apply_async(ppids: List[PreProImageDoc]) -> Any:
    image_document_preprocessing = (
            Signature(generate_bbox_annotations, kwargs={"ppids": ppids}) |
            Signature(generate_image_captions) |
            Signature(store_bbox_annotations_in_db) |
            Signature(index_image_document_in_faiss) |
            Signature(convert_to_webp_and_generate_thumbnails) |
            # Flo: the following calls are to generate and store automatically generated textual info as in text docs
            Signature(create_pptd_from_caption) |
            Signature(generate_span_annotations) |
            Signature(store_span_annotations_in_db) |
            Signature(store_document_in_elasticsearch) |
            Signature(finish_preprocessing)
    )
    return image_document_preprocessing.apply_async()
