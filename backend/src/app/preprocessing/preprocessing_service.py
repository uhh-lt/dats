from app.util.singleton_meta import SingletonMeta
from app.core.db.redis_service import RedisService
from typing import List, Optional

from app.core.data.doc_type import DocType, get_doc_type, is_archive_file
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.audio import audio_document_preprocessing_apply_async
from app.docprepro.heavy_jobs import import_uploaded_archive_apply_async
from app.docprepro.image import image_document_preprocessing_apply_async
from app.docprepro.text import text_document_preprocessing_apply_async
from app.docprepro.video import video_document_preprocessing_apply_async
from fastapi import UploadFile, HTTPException
from app.core.data.doc_type import mime_type_supported

from loguru import logger
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobRead,
    PreprocessingJobPayload,
    PreprocessingJobCreate,
)


class PreprocessingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.repo: RepoService = RepoService()

        return super(PreprocessingService, cls).__new__(cls)

    def import_uploaded_documents(
        self, proj_id: int, uploaded_files: List[UploadFile]
    ) -> Optional[PreprocessingJobRead]:
        payloads: List[PreprocessingJobPayload] = []

        for uploaded_file in uploaded_files:
            if not mime_type_supported(mime_type=uploaded_file.content_type):
                raise HTTPException(
                    detail=f"Document with MIME type {uploaded_file.content_type} not supported!",
                    status_code=406,
                )

            file_path = self.repo.store_uploaded_file_in_project_repo(
                proj_id=proj_id, uploaded_file=uploaded_file
            )
            mime_type = uploaded_file.content_type
            doc_type = get_doc_type(mime_type=mime_type)

            payloads.append(
                PreprocessingJobPayload(
                    file_path=file_path, mime_type=mime_type, doc_type=doc_type
                )
            )

        logger.info(
            f"Starting to import {len(payloads)} documents asynchronously!"
        )

        for payload in payloads:
            if payload.doc_type == DocType.text:
                text_document_preprocessing_apply_async(
                    doc_file_path=payload.file_path,
                    project_id=proj_id,
                    mime_type=payload.mime_type,
                )
            elif payload.doc_type == DocType.image:
                image_document_preprocessing_apply_async(
                    doc_file_path=payload.file_path,
                    project_id=proj_id,
                    mime_type=payload.mime_type,
                )
            elif payload.doc_type == DocType.audio:
                audio_document_preprocessing_apply_async(
                    doc_file_path=payload.file_path,
                    project_id=proj_id,
                    mime_type=payload.mime_type,
                )
            elif payload.doc_type == DocType.video:
                video_document_preprocessing_apply_async(
                    doc_file_path=payload.file_path,
                    project_id=proj_id,
                    mime_type=payload.mime_type,
                )
            elif is_archive_file(payload.mime_type):
                import_uploaded_archive_apply_async(
                    archive_file_path=payload.file_path, project_id=proj_id
                )

        create_dto = PreprocessingJobCreate(
            project_id=proj_id, payloads=payloads
        )

        return self.redis.store_preprocessing_job(preprocessing_job=create_dto)
