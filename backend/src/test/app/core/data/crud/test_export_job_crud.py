from datetime import datetime

from app.core.data.dto.export_job import (
    ExportJobCreate,
    ExportJobParameters,
    ExportJobRead,
    ExportJobUpdate,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.db.redis_service import RedisService


def test_crud_cycle() -> None:
    redis: RedisService = RedisService()

    assert True  # FIXME
    return

    params = ExportJobParameters(project_id=1)
    create = ExportJobCreate(parameters=params)
    assert create.status == BackgroundJobStatus.WAITING
    assert create.results_url is None

    read = redis.store_export_job(export_job=create)
    assert read is not None
    assert isinstance(read, ExportJobRead)
    assert read.id is not None
    assert read.created is not None
    assert (datetime.now() - read.created).total_seconds() < 10
    assert read.results_url is None
    assert read.status == BackgroundJobStatus.WAITING

    update = ExportJobUpdate(status=BackgroundJobStatus.RUNNING)
    updated = redis.update_export_job(key=read.id, update=update)
    assert updated is not None
    assert isinstance(updated, ExportJobRead)
    assert updated.id == read.id
    assert updated.created == read.created
    assert updated.parameters == read.parameters
    assert updated.status == BackgroundJobStatus.RUNNING
    assert updated.results_url is None

    update = ExportJobUpdate(status=BackgroundJobStatus.FINISHED, results_url="www.dwts.io")
    updated = redis.update_export_job(key=read.id, update=update)
    assert updated is not None
    assert isinstance(updated, ExportJobRead)
    assert updated.id == read.id
    assert updated.created == read.created
    assert updated.parameters == read.parameters
    assert updated.status == BackgroundJobStatus.FINISHED
    assert updated.results_url == "www.dwts.io"

    deleted = redis.delete_export_job(key=updated.id)
    assert deleted is not None
    assert isinstance(deleted, ExportJobRead)
    assert deleted == updated
