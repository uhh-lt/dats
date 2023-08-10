from pathlib import Path
from typing import Tuple

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from config import conf
from fastapi import UploadFile

cc = conf.docprepro.celery
sql: SQLService = SQLService()
repo: RepoService = RepoService()


def persist_as_sdoc(
    doc_filename: str, project_id: int
) -> Tuple[Path, SourceDocumentORM]:
    # generate the create_dto
    dst, create_dto = repo.build_source_document_create_dto_from_file(
        proj_id=project_id, filename=doc_filename
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
