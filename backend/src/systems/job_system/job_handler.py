from datetime import datetime

from common.gpu_utils import find_unused_cuda_device
from common.job_type import JobType
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_error,
    handle_job_finished,
)
from systems.job_system.job_dto import Job, JobInputBase


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    job = Job()
    try:
        # figure whether to run the job on gpu
        if job.job.origin == "gpu":
            import torch

            cuda_device = find_unused_cuda_device()
            with torch.cuda.device(cuda_device):
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
