from pathlib import Path

from core.celery.background_jobs.cota import start_cota_refinement_job_
from core.celery.background_jobs.crawl import start_crawler_job_
from core.celery.background_jobs.ml import start_ml_job_
from core.celery.background_jobs.perspectives import start_perspectives_job_
from core.celery.background_jobs.preprocess import (
    execute_audio_preprocessing_pipeline_,
    execute_image_preprocessing_pipeline_,
    execute_text_preprocessing_pipeline_,
    execute_video_preprocessing_pipeline_,
    import_uploaded_archive_,
)
from core.celery.background_jobs.trainer import start_trainer_job_
from core.celery.celery_worker import celery_worker
from modules.crawler.crawler_job_dto import CrawlerJobRead
from modules.ml.ml_job_dto import MLJobRead
from modules.perspectives.perspectives_job import PerspectivesJobRead
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 0, "countdown": 5},
)
def start_cota_refinement_job_task(cota_job_id: str) -> None:
    start_cota_refinement_job_(cota_job_id=cota_job_id)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 0, "countdown": 5},
)
def start_trainer_job_task(trainer_job_id: str) -> None:
    start_trainer_job_(trainer_job_id=trainer_job_id)


@celery_worker.task(acks_late=True)
def start_crawler_job(crawler_job: CrawlerJobRead) -> tuple[Path, int]:
    archive_file_path, project_id = start_crawler_job_(crawler_job=crawler_job)
    return archive_file_path, project_id


@celery_worker.task(acks_late=True)
def start_ml_job(ml_job: MLJobRead) -> None:
    start_ml_job_(ml_job=ml_job)


@celery_worker.task(acks_late=True)
def start_perspectives_job(perspectives_job: PerspectivesJobRead) -> None:
    start_perspectives_job_(perspectives_job=perspectives_job)


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
