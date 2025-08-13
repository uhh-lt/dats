from pathlib import Path
from typing import Any

from celery import Task, group
from celery.result import GroupResult
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    from core.celery.background_jobs.tasks import import_uploaded_archive

    assert isinstance(import_uploaded_archive, Task), "Not a Celery Task"

    return import_uploaded_archive.apply_async(
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )


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
