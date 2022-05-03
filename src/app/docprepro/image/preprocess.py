from pathlib import Path

from PIL import Image
from fastapi import UploadFile

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.celery.celery_worker import celery_prepro_worker
from app.docprepro.image.preproimagedoc import PreProImageDoc

sql = SQLService(echo=False)
repo = RepoService()


@celery_prepro_worker.task(acks_late=True)
def import_uploaded_image_document(doc_file: UploadFile,
                                   project_id: int) -> PreProImageDoc:
    global sql
    global repo

    # save the file to disk
    dst, create_dto = repo.store_uploaded_document(doc_file=doc_file,
                                                   project_id=project_id)

    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    # FIXME Flo: Handle this better! (remove text content from SDoc in DB)
    with Image.open(dst) as img:
        # store image metadata as SourceDocumentMetadata
        for meta in ["width", "height"]:
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key=meta,
                                                                value=str(getattr(img, meta)),
                                                                source_document_id=sdoc_db_obj.id)
            # persist SourceDocumentMetadata
            with sql.db_session() as db:
                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

    # create PreProDoc
    ppid = PreProImageDoc(project_id=project_id,
                          sdoc_id=sdoc_db_obj.id,
                          image_dst=Path(dst))

    return ppid


@celery_prepro_worker.task(acks_late=True)
def generate_automatic_bbox_annotations(ppid: PreProImageDoc) -> PreProImageDoc:
    print("generate_automatic_bbox_annotations")
    return ppid


@celery_prepro_worker.task(acks_late=True)
def persist_automatic_bbox_annotations(ppid: PreProImageDoc) -> None:
    print("persist_automatic_bbox_annotations")
