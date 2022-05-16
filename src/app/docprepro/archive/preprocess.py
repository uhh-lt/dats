from fastapi import UploadFile
from loguru import logger

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.repo.repo_service import RepoService, UnsupportedDocTypeForSourceDocument, \
    FileNotFoundInRepositoryError
from app.core.db.sql_service import SQLService
from app.docprepro.archive import preproimagedoc_multi_apply_async, preprotextdoc_multi_apply_async
from app.docprepro.celery.celery_worker import celery_prepro_worker
from app.docprepro.image.util import generate_preproimagedoc
from app.docprepro.text.util import generate_preprotextdoc

sql = SQLService(echo=False)
repo = RepoService()


@celery_prepro_worker.task(acks_late=True)
def import_uploaded_archive(archive_file: UploadFile,
                            project_id: int) -> None:
    # store and extract the archive
    file_dsts = repo.store_and_extract_archive_file(proj_id=project_id, archive_file=archive_file)

    pptds = []
    ppids = []

    for filename in map(lambda fd: fd.name, file_dsts):
        try:
            # generate create dto
            dst, create_dto = repo.generate_source_document_create_dto_from_file(proj_id=project_id,
                                                                                 filename=filename)

            # persist SDoc
            with sql.db_session() as db:
                sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

            # generate the preprodocs
            if create_dto.doctype == DocType.text:
                pptd = generate_preprotextdoc(filepath=dst, sdoc_db_obj=sdoc_db_obj)
                pptds.append(pptd)
            elif create_dto.doctype == DocType.image:
                ppid = generate_preproimagedoc(filepath=dst, sdoc_db_obj=sdoc_db_obj)
                ppids.append(ppid)
            else:
                pass
        except (FileNotFoundInRepositoryError, UnsupportedDocTypeForSourceDocument, Exception) as e:
            logger.warning(f"Skipping import of File {filename} because:\n {e}")
            continue

    # send the preprodocs to the responsible workers
    preprotextdoc_multi_apply_async(pptds=pptds)
    preproimagedoc_multi_apply_async(ppids=ppids)
