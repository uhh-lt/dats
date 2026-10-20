from datetime import UTC, datetime

from loguru import logger

from common.job_type import JobType
from config import conf
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_error,
    handle_job_finished,
    handle_job_started,
)
from systems.job_system.cuda_utils import ensure_cuda_available
from systems.job_system.job_dto import Job, JobInputBase, JobStatus
from systems.job_system.job_events import publish_job_update
from utils.gpu_utils import pin_gpu, select_gpu, set_cuda_memory_limit


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    job = Job()
    handle_job_started(jobtype, input=payload)
    publish_job_update(job)
    try:
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
        else:
            output = handler(payload=payload, job=job)

        # successfully finished job (a failing finish hook, e.g. enqueueing the next
        # pipeline step, fails the job, so it is handled like a failing handler):
        job.update(finished=datetime.now(UTC), publish=False)
        handle_job_finished(jobtype, input=payload, output=output)
    except Exception as e:
        # erroneous job:
        job.update(status_message=str(e), finished=datetime.now(UTC), publish=False)
        try:
            handle_job_error(jobtype, input=payload)
        finally:
            # RQ marks the job as FAILED only after this handler raised,
            # so the final event has to carry the terminal status explicitly
            publish_job_update(job, status_override=JobStatus.FAILED)
        raise e

    # RQ marks the job as FINISHED only after this handler returned,
    # so the final event has to carry the terminal status explicitly
    publish_job_update(job, output_override=output, status_override=JobStatus.FINISHED)
    return output
