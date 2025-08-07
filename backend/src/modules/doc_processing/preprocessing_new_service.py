from common.doc_type import DocType, get_doc_type, is_archive_file, mime_type_supported
from common.singleton_meta import SingletonMeta
from fastapi import HTTPException, UploadFile
from modules.doc_processing.text_init_job import TextInitJobInput
from preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import (
    FilesystemRepo,
)
from systems.job_system.job_service import JobService


class UnsupportedDocTypeForMimeType(Exception):
    def __init__(self, mime_type: str):
        super().__init__(
            f"Unsupported DocType! Cannot infer DocType from MimeType '{mime_type}'."
        )


class PreprocessingServiceNew(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqlr: SQLRepo = SQLRepo()
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.js = JobService()
        cls._pipelines: dict[DocType, PreprocessingPipeline] = dict()

        return super(PreprocessingServiceNew, cls).__new__(cls)

    def start_preprocessing(
        self,
        *,
        project_id: int,
        uploaded_files: list[UploadFile],
    ):
        # store uploaded files
        for uploaded_file in uploaded_files:
            # 1. Check if mime type is ok
            mime_type = uploaded_file.content_type
            if mime_type is None:
                raise HTTPException(
                    detail="Could not determine MIME type of uploaded file!",
                    status_code=406,
                )
            if not mime_type_supported(mime_type=mime_type):
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )

            # 2. store uploaded file
            file_path = self.fsr.store_uploaded_file_in_project_dir(
                proj_id=project_id, uploaded_file=uploaded_file
            )

            # 3. start correct job based on type
            if is_archive_file(mime_type):
                # TODO: Start archive processing job
                print("Archive file detected, extracting...")
                # self.js.start archive job
                return

            doc_type = get_doc_type(mime_type=mime_type)
            match doc_type:
                case DocType.text:
                    self.js.start_job(
                        job_type="text_init",
                        payload=TextInitJobInput(
                            project_id=project_id,
                            filepath=file_path,
                        ),
                    )
                case DocType.image:
                    print("Image file detected, starting image init job...")
                    # self.js.start_job(
                    #     job_type="image_init",
                    #     payload=ImageInitJobInput(
                    #         project_id=project_id, filepath=file_path
                    #     ),
                    # )
                case DocType.video:
                    print("Video file detected, starting video init job...")
                    # self.js.start_job(
                    #     job_type="video_init",
                    #     payload=VideoInitJobInput(
                    #         project_id=project_id, filepath=file_path
                    #     ),
                    # )
                case DocType.audio:
                    print("Audio file detected, starting audio init job...")
                    # self.js.start_job(
                    #     job_type="audio_init",
                    #     payload=AudioInitJobInput(
                    #         project_id=project_id, filepath=file_path
                    #     ),
                    # )
                case _:
                    raise HTTPException(
                        detail=f"Document with MIME type {mime_type} not supported!",
                        status_code=406,
                    )
