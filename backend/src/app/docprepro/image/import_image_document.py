from pathlib import Path
from typing import List

from PIL import Image

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SDocStatus, SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.image.models.preproimagedoc import PreProImageDoc
from app.docprepro.util import persist_as_sdoc, update_sdoc_status

sql = SQLService(echo=False)
repo = RepoService()


def import_image_document_(
    doc_file_path: Path, project_id: int, mime_type: str
) -> List[PreProImageDoc]:
    # persist in db
    dst, sdoc_db_obj = persist_as_sdoc(doc_file_path, project_id)

    # create ppid
    ppid = PreProImageDoc(
        project_id=sdoc_db_obj.project_id,
        sdoc_id=sdoc_db_obj.id,
        image_dst=dst,
        mime_type=mime_type,
    )

    with Image.open(dst) as img:
        # store image metadata as SourceDocumentMetadata
        for meta in ["width", "height"]:
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(
                key=meta,
                value=str(getattr(img, meta)),
                source_document_id=sdoc_db_obj.id,
                read_only=True,
            )
            # persist SourceDocumentMetadata
            with sql.db_session() as db:
                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

            ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # store the URL to the file as SourceDocumentMetadata
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    sdoc_meta_create_dto = SourceDocumentMetadataCreate(
        key="url",
        value=str(repo.get_sdoc_url(sdoc=sdoc)),
        source_document_id=sdoc_db_obj.id,
        read_only=True,
    )
    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)
    ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # Flo: update sdoc status
    update_sdoc_status(
        sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.import_image_document
    )

    # Flo: We return a list here so that we can use text PrePro also with archives which contain multiple docs
    return [ppid]
