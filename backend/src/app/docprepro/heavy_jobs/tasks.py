from pathlib import Path

from app.core.data.dto.export_job import ExportJobRead
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.heavy_jobs.export import start_export_job_
from app.docprepro.heavy_jobs.preprocess import import_uploaded_archive_


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def start_export_job(export_job: ExportJobRead) -> None:
    start_export_job_(export_job=export_job)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_uploaded_archive(archive_file_path: Path, project_id: int) -> None:
    import_uploaded_archive_(archive_file_path=archive_file_path, project_id=project_id)
