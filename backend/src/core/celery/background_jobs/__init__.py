from pathlib import Path
from typing import Any

from celery import Task, group
from celery.result import GroupResult
from modules.crawler.crawler_job_dto import CrawlerJobParameters, CrawlerJobRead
from modules.eximport.export_job_dto import ExportJobParameters, ExportJobRead
from modules.eximport.import_job_dto import ImportJobParameters, ImportJobRead
from modules.ml.ml_job_dto import MLJobParameters, MLJobRead
from modules.perspectives.perspectives_job import (
    PerspectivesJobParams,
    PerspectivesJobRead,
)
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def start_cota_refinement_job_async(
    cota_job_id: str,
) -> None:
    from core.celery.background_jobs.tasks import start_cota_refinement_job_task

    assert isinstance(start_cota_refinement_job_task, Task), "Not a Celery Task"

    start_cota_refinement_job_task.apply_async(kwargs={"cota_job_id": cota_job_id})


def start_trainer_job_async(
    trainer_job_id: str,
) -> None:
    from core.celery.background_jobs.tasks import start_trainer_job_task

    assert isinstance(start_trainer_job_task, Task), "Not a Celery Task"

    start_trainer_job_task.apply_async(kwargs={"trainer_job_id": trainer_job_id})


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    from core.celery.background_jobs.tasks import import_uploaded_archive

    assert isinstance(import_uploaded_archive, Task), "Not a Celery Task"

    return import_uploaded_archive.apply_async(
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    from core.celery.background_jobs.tasks import start_export_job
    from modules.eximport.export_service import ExportService

    assert isinstance(start_export_job, Task), "Not a Celery Task"

    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    print("-----ex id", ex_job.id)
    start_export_job.apply_async(kwargs={"export_job": ex_job})
    return ex_job


def prepare_and_start_import_job_async(
    import_job_params: ImportJobParameters,
) -> ImportJobRead:
    from core.celery.background_jobs.tasks import start_import_job
    from modules.eximport.import_service import ImportService

    assert isinstance(start_import_job, Task), "Not a Celery Task"
    ims: ImportService = ImportService()
    ims_job = ims.prepare_import_job(import_job_params)
    start_import_job.apply_async(kwargs={"import_job": ims_job})
    return ims_job


def prepare_and_start_crawling_job_async(
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    from core.celery.background_jobs.tasks import (
        import_uploaded_archive,
        start_crawler_job,
    )
    from modules.crawler.crawler_service import CrawlerService

    assert isinstance(start_crawler_job, Task), "Not a Celery Task"
    assert isinstance(import_uploaded_archive, Task), "Not a Celery Task"

    cs: CrawlerService = CrawlerService()
    cj = cs.prepare_crawler_job(crawler_params)

    job1 = start_crawler_job.signature(kwargs={"crawler_job": cj})
    job2 = import_uploaded_archive.signature()

    assert job1 is not None, "Job 1 is None"
    assert job2 is not None, "Job 2 is None"

    start_export_job_chain = job1 | job2
    assert start_export_job_chain is not None, "Job chain is None"
    start_export_job_chain.apply_async()

    return cj


def prepare_and_start_ml_job_async(
    ml_job_params: MLJobParameters,
) -> MLJobRead:
    from core.celery.background_jobs.tasks import start_ml_job
    from modules.ml.ml_service import MLService

    assert isinstance(start_ml_job, Task), "Not a Celery Task"

    mls: MLService = MLService()
    ml_job = mls.prepare_ml_job(ml_job_params)
    start_ml_job.apply_async(kwargs={"ml_job": ml_job})
    return ml_job


def prepare_and_start_perspectives_job_async(
    project_id: int,
    aspect_id: int,
    perspectives_job_params: PerspectivesJobParams,
) -> PerspectivesJobRead:
    from core.celery.background_jobs.tasks import start_perspectives_job
    from modules.perspectives.perspectives_job_service import PerspectivesJobService

    assert isinstance(start_perspectives_job, Task), "Not a Celery Task"

    pjs: PerspectivesJobService = PerspectivesJobService()
    perspectives_job = pjs.prepare_perspectives_job(
        project_id=project_id,
        aspect_id=aspect_id,
        perspectives_params=perspectives_job_params,
    )
    start_perspectives_job.apply_async(kwargs={"perspectives_job": perspectives_job})
    return perspectives_job


def execute_text_preprocessing_pipeline_apply_async(
    cargos: list[PipelineCargo],
) -> GroupResult:
    from core.celery.background_jobs.tasks import (
        execute_text_preprocessing_pipeline_task,
    )

    assert isinstance(execute_text_preprocessing_pipeline_task, Task), (
        "Not a Celery Task"
    )

    tasks = []
    for cargo in cargos:
        tasks.append(execute_text_preprocessing_pipeline_task.s(cargo=cargo))
    return group(tasks).apply_async()


def execute_image_preprocessing_pipeline_apply_async(
    cargos: list[PipelineCargo],
) -> None:
    from core.celery.background_jobs.tasks import (
        execute_image_preprocessing_pipeline_task,
    )

    assert isinstance(execute_image_preprocessing_pipeline_task, Task), (
        "Not a Celery Task"
    )

    for cargo in cargos:
        execute_image_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_audio_preprocessing_pipeline_apply_async(
    cargos: list[PipelineCargo],
) -> None:
    from core.celery.background_jobs.tasks import (
        execute_audio_preprocessing_pipeline_task,
    )

    assert isinstance(execute_audio_preprocessing_pipeline_task, Task), (
        "Not a Celery Task"
    )

    for cargo in cargos:
        execute_audio_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_video_preprocessing_pipeline_apply_async(
    cargos: list[PipelineCargo],
) -> None:
    from core.celery.background_jobs.tasks import (
        execute_video_preprocessing_pipeline_task,
    )

    assert isinstance(execute_video_preprocessing_pipeline_task, Task), (
        "Not a Celery Task"
    )

    for cargo in cargos:
        execute_video_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})
