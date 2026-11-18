import signal
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from types import FrameType, TracebackType

import rq
from loguru import logger
from redis import Redis
from rq.defaults import DEFAULT_FAILURE_TTL

from config import conf
from systems.job_system.cuda_utils import ensure_cuda_available
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_events import publish_job_update
from systems.job_system.job_exceptions import JobStoppedError
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus, JobTiming
from utils.gpu_utils import pin_gpu, select_gpu, set_cuda_memory_limit

# Interrupts the job a worker runs in its own process (`DATSSimpleWorker`)
STOP_SIGNAL = signal.SIGUSR1


def _raise_job_stopped(signum: int, frame: FrameType | None) -> None:
    raise JobStoppedError()


@contextmanager
def _stoppable() -> Iterator[None]:
    """Let the stop signal interrupt the block with `JobStoppedError`, also
    while it waits, e.g. for a response. Before and after, the worker ignores
    the signal: the job has not started yet or its work is done."""
    previous = signal.signal(STOP_SIGNAL, _raise_job_stopped)
    try:
        yield
    finally:
        signal.signal(STOP_SIGNAL, previous)


def rq_job_handler(jobtype: str, handler, payload: JobInputBase):
    """Run a job between the `started` and `finished` hooks. A failing job
    raises: RQ then calls `rq_job_failed`. A stop (`JobService.stop_job`)
    interrupts the job until its handler returned."""
    job = Job()
    hooks = JobService().hooks
    with _stoppable():
        hooks.started(jobtype, payload)
        publish_job_update(job)

        # figure whether to run the job on gpu
        if job.job.origin.startswith("gpu"):
            import torch

            # select and pin the GPU before anything initializes CUDA in this
            # work horse: afterwards the job sees exactly this GPU, as cuda:0
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
    # until RQ saved the output, the job may still fail (e.g. its worker dies)
    # and be retried: its checkpoint outlives the finish by a day
    job.end_checkpoint(ttl=int(JobTiming.ONE_DAY))

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
    a failed or stopped job runs the `failed` hook. RQ calls it in the worker
    once the job raised (its handler, a hook, the timeout or a stop), in the
    worker that forked a job process that died or was stopped
    (`DATSWorker.handle_work_horse_killed`, `DATSWorker.handle_job_failure`),
    and in the cleanup of the started jobs once the worker that ran the job
    died. A stopped job (`JobStoppedError`) ends as STOPPED, any other as
    FAILED. Never raises: a failure is logged."""
    dats_job = Job(job)
    stopped = isinstance(exc_value, JobStoppedError)
    try:
        dats_job.update(
            status_message=str(exc_value) or exc_type.__name__,
            finished=datetime.now(UTC),
            publish=False,
        )
        # a retry continues from the checkpoint: it expires with the failed job,
        # also if the `failed` hook raises
        dats_job.end_checkpoint(
            ttl=job.failure_ttl if job.failure_ttl is not None else DEFAULT_FAILURE_TTL
        )
        JobService().hooks.failed(job.kwargs["jobtype"], job.kwargs["payload"])
    except Exception as e:
        logger.exception(f"The failure handling of job {job.id} failed: {e}")
    finally:
        # RQ marks the job as FAILED or STOPPED only after the callback,
        # so the final event has to carry the terminal status explicitly
        publish_job_update(
            dats_job,
            status_override=JobStatus.STOPPED if stopped else JobStatus.FAILED,
        )
