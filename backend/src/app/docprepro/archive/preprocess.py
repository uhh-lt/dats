from pathlib import Path

import magic
from loguru import logger
from tqdm import tqdm

from app.core.data.doc_type import DocType, get_doc_type
from app.core.data.repo.repo_service import RepoService, UnsupportedDocTypeForSourceDocument, \
    FileNotFoundInRepositoryError
from app.core.db.sql_service import SQLService
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image import image_document_preprocessing_without_import_apply_async
from app.docprepro.image.import_image_document import import_image_document_
from app.docprepro.text import text_document_preprocessing_without_import_apply_async
from app.docprepro.text.import_text_document import import_text_document_
from config import conf

sql = SQLService(echo=False)
repo = RepoService()


@celery_worker.task(acks_late=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 5, 'countdown': 5})
def import_uploaded_archive(archive_file_path: Path,
                            project_id: int) -> None:
    # store and extract the archive
    file_dsts = repo.extract_archive_in_project(proj_id=project_id,
                                                archive_path=archive_file_path)
    pptds = []
    ppids = []

    for filepath in tqdm(file_dsts,
                         total=len(file_dsts),
                         desc="Processing files in archive... "):
        try:
            mime_type = magic.from_file(filepath, mime=True)
            doctype = get_doc_type(mime_type=mime_type)

            # generate the preprodocs
            if doctype == DocType.text:
                pptd = import_text_document_(doc_file_path=filepath, project_id=project_id, mime_type=mime_type)[0]
                pptds.append(pptd)
            elif doctype == DocType.image:
                ppid = import_image_document_(doc_file_path=filepath, project_id=project_id, mime_type=mime_type)[0]
                ppids.append(ppid)
            else:
                pass
        except (FileNotFoundInRepositoryError, UnsupportedDocTypeForSourceDocument, Exception) as e:
            logger.warning(f"Skipping import of File {filepath.name} because:\n {e}")
            continue

        # send the preprodocs to the responsible workers batch-wise
        if len(pptds) >= conf.docprepro.celery.batch_size.text:
            logger.debug(f"Sending batch of {len(pptds)} text documents to text preprocessing celery worker!")
            text_document_preprocessing_without_import_apply_async(pptds=pptds)
            pptds = []
        if len(ppids) >= conf.docprepro.celery.batch_size.image:
            logger.debug(f"Sending batch of {len(ppids)} image documents to image preprocessing celery worker!")
            image_document_preprocessing_without_import_apply_async(ppids=ppids)
            ppids = []

    # send the last batch of preprodocs to the responsible workers
    if len(pptds) > 0:
        logger.debug(f"Sending batch of {len(pptds)} text documents to text preprocessing celery worker!")
        text_document_preprocessing_without_import_apply_async(pptds=pptds)
    if len(ppids) > 0:
        logger.debug(f"Sending batch of {len(ppids)} image documents to image preprocessing celery worker!")
        image_document_preprocessing_without_import_apply_async(ppids=ppids)
