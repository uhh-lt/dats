from pathlib import Path
from typing import Any

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

from app.core.data.dto.export_job import ExportJobRead, ExportJobParameters
from app.core.data.export.export_service import ExportService

import_uploaded_archive_task = "app.docprepro.heavy_jobs.tasks.import_uploaded_archive"
start_export_job_task = "app.docprepro.heavy_jobs.tasks.start_export_job"

def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    archive_preprocessing = Signature(
        import_uploaded_archive_task,
        kwargs={"archive_file_path": archive_file_path, "project_id": project_id},
    )
    return archive_preprocessing.apply_async()


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    start_export_job = Signature(start_export_job_task, kwargs={"export_job": ex_job})
    start_export_job.apply_async()

    return ex_job
