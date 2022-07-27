from typing import Any

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature
from fastapi import UploadFile

from app.docprepro.image.preproimagedoc import PreProImageDoc

# Flo: Task names (as they could be imported)
import_uploaded_image_document = "app.docprepro.image.preprocess.import_uploaded_image_document"
generate_automatic_bbox_annotations = "app.docprepro.image.preprocess.generate_automatic_bbox_annotations"
generate_automatic_captions = "app.docprepro.image.preprocess.generate_automatic_image_captions"
persist_automatic_bbox_annotations = "app.docprepro.image.preprocess.persist_automatic_bbox_annotations"


def image_document_preprocessing_apply_async(doc_file: UploadFile, project_id: int) -> Any:
    image_document_preprocessing = (
            Signature(import_uploaded_image_document, kwargs={"doc_file": doc_file, "project_id": project_id}) |
            Signature(generate_automatic_bbox_annotations) |
            Signature(generate_automatic_captions) |
            Signature(persist_automatic_bbox_annotations)
    )
    return image_document_preprocessing.apply_async()
