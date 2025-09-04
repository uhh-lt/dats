from datetime import datetime

from common.job_type import JobType
from modules.doc_processing.doc_processing_pipeline import (
    handle_job_error,
    handle_job_finished,
)
from systems.job_system.job_dto import Job, JobInputBase


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    job = Job()
    try:
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
