from pathlib import Path

from PIL import Image

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.image.preproimagedoc import PreProImageDoc

sql = SQLService(echo=False)
repo = RepoService()


def generate_preproimagedoc(filepath: Path, sdoc_db_obj: SourceDocumentORM):
    ppid = PreProImageDoc(project_id=sdoc_db_obj.project_id,
                          sdoc_id=sdoc_db_obj.id,
                          image_dst=filepath)

    with Image.open(filepath) as img:
        # store image metadata as SourceDocumentMetadata
        for meta in ["width", "height"]:
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key=meta,
                                                                value=str(getattr(img, meta)),
                                                                source_document_id=sdoc_db_obj.id,
                                                                read_only=True)
            # persist SourceDocumentMetadata
            with sql.db_session() as db:
                crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

            ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # store the URL to the file as SourceDocumentMetadata
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="url",
                                                        value=str(repo.get_sdoc_url(sdoc=sdoc)),
                                                        source_document_id=sdoc_db_obj.id,
                                                        read_only=True)
    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)
    ppid.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    return ppid
