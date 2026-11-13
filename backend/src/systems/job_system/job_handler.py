from datetime import UTC, datetime
from types import TracebackType

import rq
from loguru import logger
from redis import Redis

from common.job_type_enum import JobType
from config import conf
from systems.job_system.cuda_utils import ensure_cuda_available
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_events import publish_job_update
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus
from utils.gpu_utils import pin_gpu, select_gpu, set_cuda_memory_limit


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    """Run a job between the `started` and `finished` hooks. A failing job
    raises: RQ then calls `rq_job_failed`."""
    job = Job()
    hooks = JobService().hooks
    hooks.started(jobtype, payload)
    publish_job_update(job)

    # figure whether to run the job on gpu
    if job.job.origin.startswith("gpu"):
        import torch

        # select and pin the GPU before anything initializes CUDA in this work
        # horse: afterwards the job sees exactly this GPU, as cuda:0
        gpu_uuid = select_gpu()
        if gpu_uuid is not None:
            pin_gpu(gpu_uuid)

        ensure_cuda_available()

        if gpu_uuid is not None and torch.cuda.device_count() != 1:
            logger.warning(
                f"CUDA was initialized before GPU {gpu_uuid} was pinned, "
                f"job {jobtype} runs on the first visible GPU instead."
            )
        logger.info(f"Running job {jobtype} on GPU {gpu_uuid or 'cuda:0'}")
        set_cuda_memory_limit(conf.rq.gpu_memory_limit)
    output = handler(payload=payload, job=job)

    # a failing finish hook fails the job, so it is handled like a failing
    # handler (e.g. enqueueing the job after an entry point)
    job.update(finished=datetime.now(UTC), publish=False)
    hooks.finished(jobtype, payload, output)

    # RQ marks the job as FINISHED only after this handler returned,
    # so the final event has to carry the terminal status explicitly
    publish_job_update(job, output_override=output, status_override=JobStatus.FINISHED)
    return output


def rq_job_failed(
    job: rq.job.Job,
    connection: Redis,
    exc_type: type[BaseException],
    exc_value: BaseException,
    traceback: TracebackType | None,
) -> None:
    """RQ's failure callback of every job (`on_failure`), the one place where
    a failed job runs the `failed` hook. RQ calls it in the worker once the job
    raised (its handler, a hook or the timeout), in the worker that forked a
    job process that died (`DATSWorker.handle_work_horse_killed`), and in the
    cleanup of the started jobs once the worker that ran the job died. Never
    raises: a failure is logged."""
    dats_job = Job(job)
    try:
        dats_job.update(
            status_message=str(exc_value) or exc_type.__name__,
            finished=datetime.now(UTC),
            publish=False,
        )
        JobService().hooks.failed(job.kwargs["jobtype"], job.kwargs["payload"])
    except Exception as e:
        logger.exception(f"The failure handling of job {job.id} failed: {e}")
    finally:
        # RQ marks the job as FAILED only after the callback,
        # so the final event has to carry the terminal status explicitly
        publish_job_update(dats_job, status_override=JobStatus.FAILED)
