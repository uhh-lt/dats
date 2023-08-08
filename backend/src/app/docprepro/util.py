from pathlib import Path
from typing import Tuple

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.doc_type import DocType, get_doc_type, is_archive_file
from app.core.data.dto.preprocessing_job import PreprocessingJobPayload
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.audio import audio_document_preprocessing_apply_async
from app.docprepro.heavy_jobs import import_uploaded_archive_apply_async
from app.docprepro.image import image_document_preprocessing_apply_async
from app.docprepro.text import text_document_preprocessing_apply_async
from app.docprepro.video import video_document_preprocessing_apply_async
from config import conf
from fastapi import UploadFile

cc = conf.docprepro.celery
sql: SQLService = SQLService()
repo: RepoService = RepoService()


def preprocess_uploaded_file(
    proj_id: int, uploaded_file: UploadFile
) -> PreprocessingJobPayload:
    # Flo: For some magical reason we have to update celery configs here again. Most probably because FastAPI or
    #  Starlette reset kombu serialization settings which in turn affects the celery worker configs. Another issue
    #  might be that we're launching this in as a BackgroundTask (i.e. in a separate Process or Thread)
    # FIXME Flo: this still doesnt work although the settings are updated!
    # celery_prepro_worker.conf.update(**CeleryConfig().to_dict())

    file_path = repo.store_uploaded_file_in_project_repo(
        proj_id=proj_id, uploaded_file=uploaded_file
    )
    mime_type = uploaded_file.content_type
    doc_type = get_doc_type(mime_type=mime_type)

    if doc_type == DocType.text:
        text_document_preprocessing_apply_async(
            doc_file_path=file_path, project_id=proj_id, mime_type=mime_type
        )
    elif doc_type == DocType.image:
        image_document_preprocessing_apply_async(
            doc_file_path=file_path, project_id=proj_id, mime_type=mime_type
        )
    elif doc_type == DocType.audio:
        audio_document_preprocessing_apply_async(
            doc_file_path=file_path, project_id=proj_id, mime_type=mime_type
        )
    elif doc_type == DocType.video:
        video_document_preprocessing_apply_async(
            doc_file_path=file_path, project_id=proj_id, mime_type=mime_type
        )
    elif is_archive_file(uploaded_file.content_type):
        import_uploaded_archive_apply_async(
            archive_file_path=file_path, project_id=proj_id
        )

    return PreprocessingJobPayload(
        project_id=proj_id,
        file_path=file_path,
        mime_type=mime_type,
        doc_type=doc_type,
    )


def persist_as_sdoc(
    doc_file_path: Path, project_id: int
) -> Tuple[Path, SourceDocumentORM]:
    # generate the create_dto
    dst, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=project_id, filename=doc_file_path.name
    )
    # persist SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)
        sdoc_id = sdoc_db_obj.id
        filename = sdoc_db_obj.filename

    # persist SourceDocument Metadata
    with sql.db_session() as db:
        metadata_create_dtos = [
            # persist original filename
            SourceDocumentMetadataCreate(
                key="file_name",
                value=filename,
                source_document_id=sdoc_id,
                read_only=True,
            ),
            # persist name
            SourceDocumentMetadataCreate(
                key="name",
                value=filename,
                source_document_id=sdoc_id,
                read_only=False,
            ),
        ]
        crud_sdoc_meta.create_multi(db=db, create_dtos=metadata_create_dtos)

    # read SourceDocument
    with sql.db_session() as db:
        sdoc_db_obj_read = crud_sdoc.read(db=db, id=sdoc_id)

    return dst, sdoc_db_obj_read


def update_sdoc_status(sdoc_id: int, sdoc_status: SDocStatus) -> SourceDocumentORM:
    # update status
    with sql.db_session() as db:
        sdoc_db_obj = crud_sdoc.update_status(
            db=db, sdoc_id=sdoc_id, sdoc_status=sdoc_status
        )
    return sdoc_db_obj
