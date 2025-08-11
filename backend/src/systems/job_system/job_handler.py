from datetime import datetime

from modules.doc_processing.doc_processing_pipeline import handle_job_finished
from systems.job_system.job_dto import Job


def rq_job_handler(handler, payload):
    job = Job()
    output = handler(payload=payload, job=job)
    job.update(finished=datetime.now())
    handle_job_finished(job.job.meta["type"], input=payload, output=output)
    return output
