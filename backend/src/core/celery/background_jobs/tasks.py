from pathlib import Path

from core.celery.background_jobs.preprocess import (
    execute_audio_preprocessing_pipeline_,
    execute_image_preprocessing_pipeline_,
    execute_text_preprocessing_pipeline_,
    execute_video_preprocessing_pipeline_,
    import_uploaded_archive_,
)
from core.celery.celery_worker import celery_worker
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_text_preprocessing_pipeline_task(
    cargo: PipelineCargo, is_init: bool = True
) -> None:
    execute_text_preprocessing_pipeline_(cargo=cargo, is_init=is_init)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_image_preprocessing_pipeline_task(
    cargo: PipelineCargo, is_init: bool = True
) -> None:
    execute_image_preprocessing_pipeline_(cargo=cargo, is_init=is_init)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_audio_preprocessing_pipeline_task(
    cargo: PipelineCargo,
    is_init: bool = True,
) -> None:
    execute_audio_preprocessing_pipeline_(cargo=cargo, is_init=is_init)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_video_preprocessing_pipeline_task(
    cargo: PipelineCargo,
    is_init: bool = True,
) -> None:
    execute_video_preprocessing_pipeline_(cargo=cargo, is_init=is_init)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_uploaded_archive(archive_file_path_and_project_id: tuple[Path, int]) -> None:
    # we need a tuple to chain the task since chaining only allows for one return object
    archive_file_path, project_id = archive_file_path_and_project_id
    import_uploaded_archive_(archive_file_path=archive_file_path, project_id=project_id)
