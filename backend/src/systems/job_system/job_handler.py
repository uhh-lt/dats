from datetime import datetime

from common.job_type import JobType
from config import conf
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_error,
    handle_job_finished,
    handle_job_started,
)
from systems.job_system.job_dto import Job, JobInputBase
from utils.gpu_utils import find_unused_cuda_device, set_cuda_memory_limit


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    job = Job()
    handle_job_started(jobtype, input=payload)
    try:
        # figure whether to run the job on gpu
        if job.job.origin == "gpu":
            import torch

            cuda_device = find_unused_cuda_device()
            with torch.cuda.device(cuda_device):
                set_cuda_memory_limit(conf.job.gpu_memory_limit)
                output = handler(payload=payload, job=job)
        else:
            output = handler(payload=payload, job=job)
    except Exception as e:
        # erroneous job:
        job.update(status_message=str(e))
        handle_job_error(jobtype, input=payload)
        raise e
    finally:
        # always set the time the job ended
        job.update(finished=datetime.now())

    # successfully finished job:
    handle_job_finished(jobtype, input=payload, output=output)
    return output
