from datetime import datetime

from common.job_type import JobType
from modules.doc_processing.doc_processing_pipeline import handle_job_finished
from systems.job_system.job_dto import Job, JobInputBase


def rq_job_handler(jobtype: JobType, handler, payload: JobInputBase):
    job = Job()
    output = handler(payload=payload, job=job)
    job.update(finished=datetime.now())
    handle_job_finished(jobtype, input=payload, output=output)
    return output
