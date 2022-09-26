from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Tuple, IO

from fastapi import UploadFile, HTTPException

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import get_doc_type, DocType, is_archive_file
from app.core.data.dto.source_document import SDocStatus
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.archive import import_uploaded_archive_apply_async
from app.docprepro.image import image_document_preprocessing_apply_async
from app.docprepro.text import text_document_preprocessing_apply_async
from config import conf

cc = conf.docprepro.celery
sql = SQLService()
repo = RepoService()


def preprocess_uploaded_file(proj_id: int, uploaded_file: UploadFile) -> None:
    # Flo: For some magical reason we have to update celery configs here again. Most probably because FastAPI or
    #  Starlette reset kombu serialization settings which in turn affects the celery worker configs. Another issue
    #  might be that we're launching this in as a BackgroundTask (i.e. in a separate Process or Thread)
    # FIXME Flo: this still doesnt work although the settings are updated!
    # celery_prepro_worker.conf.update(**CeleryConfig().to_dict())

    doc_type = get_doc_type(mime_type=uploaded_file.content_type)
    if doc_type == DocType.text:
        text_document_preprocessing_apply_async(doc_file=uploaded_file, project_id=proj_id)
    elif doc_type == DocType.image:
        image_document_preprocessing_apply_async(doc_file=uploaded_file, project_id=proj_id)
    elif is_archive_file(uploaded_file.content_type):
        temporary_archive_file_path = _store_archive_temporarily(uploaded_file=uploaded_file)
        import_uploaded_archive_apply_async(temporary_archive_file_path=temporary_archive_file_path, project_id=proj_id)


def _store_archive_temporarily(uploaded_file: UploadFile) -> Path:
    real_file_size = 0
    temp: IO = NamedTemporaryFile(delete=False)
    for chunk in uploaded_file.file:
        real_file_size += len(chunk)
        if real_file_size > conf.api.max_upload_file_size:
            raise HTTPException(status_code=413,
                                detail=(f"File {uploaded_file.filename} is too large!"
                                        f" Maximum allowed size in bytes: {conf.api.max_upload_file_size}"))
        temp.write(chunk)
    temp.close()
    dst = repo.store_temporary_file(temp=temp)
    return Path(dst)


def persist_as_sdoc(doc_file: UploadFile,
                    project_id: int) -> Tuple[Path, SourceDocumentORM]:
    # save the file to disk
    dst = repo.store_uploaded_file_in_project(uploaded_file=doc_file,
                                              proj_id=project_id)
    # generate the create_dto
    dst, create_dto = repo.generate_source_document_create_dto_from_file(proj_id=project_id,
                                                                         filename=doc_file.filename)
    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return dst, sdoc_db_obj


def update_sdoc_status(sdoc_id: int, sdoc_status: SDocStatus) -> SourceDocumentORM:
    # update status
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.update_status(db=db,
                                              sdoc_id=sdoc_id,
                                              sdoc_status=sdoc_status)
    return sdoc_db_obj
