from pathlib import Path
from typing import Dict, List, Optional

import magic
from app.celery.background_jobs import (
    execute_audio_preprocessing_pipeline_apply_async,
    execute_image_preprocessing_pipeline_apply_async,
    execute_text_preprocessing_pipeline_apply_async,
    execute_video_preprocessing_pipeline_apply_async,
)
from app.core.data.doc_type import (
    DocType,
    get_doc_type,
    is_archive_file,
    mime_type_supported,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobCreate,
    PreprocessingJobPayload,
    PreprocessingJobRead,
)
from app.core.data.repo.repo_service import (
    FileNotFoundInRepositoryError,
    RepoService,
    UnsupportedDocTypeForSourceDocument,
)
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from app.util.singleton_meta import SingletonMeta
from fastapi import HTTPException, UploadFile
from loguru import logger
from tqdm import tqdm


class PreprocessingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.repo: RepoService = RepoService()
        cls._pipelines: Dict[DocType, PreprocessingPipeline] = dict()

        return super(PreprocessingService, cls).__new__(cls)

    def _store_uploaded_files_and_create_payloads(
        self, proj_id: int, uploaded_files: List[UploadFile]
    ) -> List[PreprocessingJobPayload]:
        payloads: List[PreprocessingJobPayload] = []
        for uploaded_file in uploaded_files:
            mime_type = uploaded_file.content_type
            if not mime_type_supported(mime_type=mime_type):
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )

            file_path = self.repo.store_uploaded_file_in_project_repo(
                proj_id=proj_id, uploaded_file=uploaded_file
            )

            if is_archive_file(mime_type):
                # if the uploaded file is an archive, we extract it and create
                # PreprocessingJobPayloads for each file in the archive
                payloads.extend(
                    self._extract_archive_and_create_payloads(
                        project_id=proj_id, archive_file_path=file_path
                    )
                )
                continue

            doc_type = get_doc_type(mime_type=mime_type)

            payloads.append(
                PreprocessingJobPayload(
                    project_id=proj_id,
                    filename=file_path.name,
                    mime_type=mime_type,
                    doc_type=doc_type,
                )
            )
        return payloads

    def _extract_archive_and_create_payloads(
        self, project_id: int, archive_file_path: Path
    ) -> List[PreprocessingJobPayload]:
        # store and extract the archive
        file_dsts: List[Path] = self.repo.extract_archive_in_project(
            proj_id=project_id, archive_path=archive_file_path
        )
        payloads: List[PreprocessingJobPayload] = []

        for file_path in tqdm(
            file_dsts,
            total=len(file_dsts),
            desc=f"Processing files in archive {archive_file_path}... ",
        ):
            try:
                mime_type = magic.from_file(file_path, mime=True)
                doc_type = get_doc_type(mime_type=mime_type)

                payloads.append(
                    PreprocessingJobPayload(
                        project_id=project_id,
                        filename=file_path.name,
                        mime_type=mime_type,
                        doc_type=doc_type,
                    )
                )

            except (
                FileNotFoundInRepositoryError,
                UnsupportedDocTypeForSourceDocument,
                Exception,
            ) as e:
                logger.warning(
                    f"Skipping import of file {file_path.name} because:\n {e}!"
                )
                continue

        return payloads

    def _create_and_store_preprocessing_job(
        self, proj_id: int, payloads: List[PreprocessingJobPayload]
    ) -> PreprocessingJobRead:
        create_dto = PreprocessingJobCreate(project_id=proj_id, payloads=payloads)
        read_dto = self.redis.store_preprocessing_job(preprocessing_job=create_dto)
        if read_dto is None:
            raise HTTPException(
                detail="Could not store PreprocessingJob!", status_code=500
            )

        logger.info(
            (
                f"Created PreprocessingJob {read_dto.id} to import {len(payloads)}"
                "documents asynchronously!"
            )
        )

        return read_dto

    def _create_pipeline_cargos_from_preprocessing_job(
        self,
        ppj: PreprocessingJobRead,
    ) -> Dict[DocType, List[PipelineCargo]]:
        # create the PipelineCargos for the different DocTypes
        cargos: Dict[DocType, List[PipelineCargo]] = dict()
        for payload in ppj.payloads:
            if payload.doc_type not in cargos:
                cargos[payload.doc_type] = [
                    PipelineCargo(ppj_payload=payload, ppj_id=ppj.id)
                ]
            else:
                cargos[payload.doc_type].append(
                    PipelineCargo(ppj_payload=payload, ppj_id=ppj.id)
                )
        return cargos

    def create_and_start_preprocessing_job_from_payloads_async(
        self, payloads: List[PreprocessingJobPayload]
    ) -> Optional[PreprocessingJobRead]:
        if len(payloads) == 0:
            return None

        proj_id = payloads[0].project_id
        if not all([proj_id == p.project_id for p in payloads]):
            raise ValueError("All payloads must have the same project_id!")

        ppj = self._create_and_store_preprocessing_job(proj_id, payloads)

        cargos = self._create_pipeline_cargos_from_preprocessing_job(ppj=ppj)

        for doc_type in cargos.keys():
            if doc_type == DocType.text:
                execute_text_preprocessing_pipeline_apply_async(cargos=cargos[doc_type])
            elif doc_type == DocType.image:
                execute_image_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            elif doc_type == DocType.audio:
                execute_audio_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            elif doc_type == DocType.video:
                execute_video_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            else:
                raise HTTPException(
                    detail=f"Unsupported DocType {doc_type}!", status_code=500
                )
            # elif is_archive_file(payload.mime_type):
            # import_uploaded_archive_apply_async(
            #     archive_file_path=payload.filename, project_id=proj_id
            # )

        # update the PreprocessingJob status to IN_PROGRESS
        self.redis.update_preprocessing_job(
            ppj.id, ppj.update_status(BackgroundJobStatus.RUNNING)
        )

        return ppj

    def prepare_and_start_preprocessing_job_async(
        self,
        *,
        proj_id: int,
        uploaded_files: Optional[List[UploadFile]] = None,
        archive_file_path: Optional[Path] = None,
    ) -> Optional[PreprocessingJobRead]:
        if uploaded_files is not None and archive_file_path is not None:
            raise ValueError(
                "Either uploaded_files or archive_file_path must be specified, but not both!"
            )
        elif uploaded_files is not None:
            payloads = self._store_uploaded_files_and_create_payloads(
                proj_id=proj_id, uploaded_files=uploaded_files
            )
        elif archive_file_path is not None:
            payloads = self._extract_archive_and_create_payloads(
                project_id=proj_id, archive_file_path=archive_file_path
            )
        else:
            raise ValueError(
                "Either uploaded_files or archive_file_path must be specified!"
            )

        return self.create_and_start_preprocessing_job_from_payloads_async(
            payloads=payloads
        )

    def _get_pipeline(self, doc_type: DocType) -> PreprocessingPipeline:
        if doc_type not in self._pipelines:
            self._pipelines[doc_type] = PreprocessingPipeline(
                doc_type=doc_type, num_workers=1, force_sequential=True
            )
        return self._pipelines[doc_type]

    def get_text_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_text_pipeline

        if DocType.text not in self._pipelines:
            pipeline = build_text_pipeline()
            self._pipelines[DocType.text] = pipeline
        return self._pipelines[DocType.text]

    def get_image_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_image_pipeline

        if DocType.image not in self._pipelines:
            pipeline = build_image_pipeline()
            self._pipelines[DocType.image] = pipeline
        return self._pipelines[DocType.image]

    def get_audio_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_audio_pipeline

        if DocType.audio not in self._pipelines:
            pipeline = build_audio_pipeline()
            self._pipelines[DocType.audio] = pipeline
        return self._pipelines[DocType.audio]

    def get_video_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_video_pipeline

        if DocType.video not in self._pipelines:
            pipeline = build_video_pipeline()
            self._pipelines[DocType.video] = pipeline
        return self._pipelines[DocType.video]
