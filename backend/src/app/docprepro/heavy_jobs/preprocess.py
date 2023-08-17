from pathlib import Path

import magic
from app.core.data.doc_type import DocType, get_doc_type
from app.core.data.repo.repo_service import (
    FileNotFoundInRepositoryError,
    RepoService,
    UnsupportedDocTypeForSourceDocument,
)
from app.core.db.sql_service import SQLService
from app.docprepro.audio import audio_document_preprocessing_without_import_apply_async
from app.docprepro.audio.import_audio_document import import_audio_document_
from app.docprepro.image import image_document_preprocessing_without_import_apply_async
from app.docprepro.image.import_image_document import import_image_document_
from app.docprepro.text import text_document_preprocessing_without_import_apply_async
from app.docprepro.text.import_text_document import import_text_document_
from app.docprepro.video import video_document_preprocessing_without_import_apply_async
from app.docprepro.video.import_video_document import import_video_document_
from config import conf
from loguru import logger
from tqdm import tqdm

sql: SQLService = SQLService(echo=False)
repo: RepoService = RepoService()


def import_uploaded_archive_(archive_file_path: Path, project_id: int) -> None:
    # store and extract the archive
    file_dsts = repo.extract_archive_in_project(
        proj_id=project_id, archive_path=archive_file_path
    )
    pptds = []
    ppids = []
    ppads = []
    ppvds = []

    for filepath in tqdm(
        file_dsts, total=len(file_dsts), desc="Processing files in archive... "
    ):
        try:
            mime_type = magic.from_file(filepath, mime=True)
            doctype = get_doc_type(mime_type=mime_type)

            # generate the preprodocs
            if doctype == DocType.text:
                pptd = import_text_document_(
                    doc_filename=filepath.name,
                    project_id=project_id,
                    mime_type=mime_type,
                )[0]
                pptds.append(pptd)
            elif doctype == DocType.image:
                ppid = import_image_document_(
                    doc_filename=filepath.name,
                    project_id=project_id,
                    mime_type=mime_type,
                )[0]
                ppids.append(ppid)
            elif doctype == DocType.audio:
                ppad = import_audio_document_(
                    doc_filename=filepath.name,
                    project_id=project_id,
                    mime_type=mime_type,
                )[0]
                ppads.append(ppad)
            elif doctype == DocType.video:
                ppvd = import_video_document_(
                    doc_filename=filepath.name,
                    project_id=project_id,
                    mime_type=mime_type,
                )[0]
                ppvds.append(ppvd)
            else:
                logger.warning(
                    f"Unknown DocType for {str(filepath)} with MIME {mime_type}"
                )
                raise UnsupportedDocTypeForSourceDocument(filepath)
        except (
            FileNotFoundInRepositoryError,
            UnsupportedDocTypeForSourceDocument,
            Exception,
        ) as e:
            logger.warning(f"Skipping import of File {filepath.name} because:\n {e}")
            continue

        # send the preprodocs to the responsible workers batch-wise
        if len(pptds) >= conf.docprepro.celery.batch_size.text:
            logger.info(
                f"Sending batch of {len(pptds)} text documents to text preprocessing celery worker!"
            )
            text_document_preprocessing_without_import_apply_async(pptds=pptds)
            pptds = []
        if len(ppids) >= conf.docprepro.celery.batch_size.image:
            logger.info(
                f"Sending batch of {len(ppids)} image documents to image preprocessing celery worker!"
            )
            image_document_preprocessing_without_import_apply_async(ppids=ppids)
            ppids = []
        if len(ppads) >= conf.docprepro.celery.batch_size.audio:
            logger.info(
                f"Sending batch of {len(ppads)} audio documents to audio preprocessing celery worker!"
            )
            audio_document_preprocessing_without_import_apply_async(ppads=ppads)
            ppads = []
        if len(ppvds) >= conf.docprepro.celery.batch_size.video:
            logger.info(
                f"Sending batch of {len(ppvds)} video documents to video preprocessing celery worker!"
            )
            video_document_preprocessing_without_import_apply_async(ppvds=ppvds)
            ppvds = []

    # send the last batch of preprodocs to the responsible workers
    if len(pptds) > 0:
        logger.info(
            f"Sending batch of {len(pptds)} text documents to text preprocessing celery worker!"
        )
        text_document_preprocessing_without_import_apply_async(pptds=pptds)
    if len(ppids) > 0:
        logger.info(
            f"Sending batch of {len(ppids)} image documents to image preprocessing celery worker!"
        )
        image_document_preprocessing_without_import_apply_async(ppids=ppids)
    if len(ppads) > 0:
        logger.info(
            f"Sending batch of {len(ppads)} audio documents to image preprocessing celery worker!"
        )
        audio_document_preprocessing_without_import_apply_async(ppads=ppads)
    if len(ppvds) > 0:
        logger.info(
            f"Sending batch of {len(ppvds)} image documents to image preprocessing celery worker!"
        )
        video_document_preprocessing_without_import_apply_async(ppvds=ppvds)
