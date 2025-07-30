import time

from modules.duplicate_finder.duplicate_finder_dto import (
    DuplicateFinderInput,
    DuplicateFinderOutput,
    DuplicateInfo,
)
from rq import get_current_job
from systems.job_system.job_register_decorator import register_job


@register_job(
    job_type="duplicate_finder",
    input_type=DuplicateFinderInput,
    output_type=DuplicateFinderOutput,
    generate_endpoints=True,
)
def find_duplicates_job(
    payload: DuplicateFinderInput,
) -> DuplicateFinderOutput:
    job = get_current_job()
    assert job is not None, "Job must be running in a worker context"

    job.meta["status_message"] = "Started duplicate search"
    job.save_meta()

    time.sleep(1)

    job.meta["status_message"] = "50% complete"
    job.save_meta()

    time.sleep(1)
    duplicates = [
        DuplicateInfo(doc_id=1, duplicate_of=2),
        DuplicateInfo(doc_id=3, duplicate_of=4),
    ]
    output_dto = DuplicateFinderOutput(
        project_id=payload.project_id,
        user_id=payload.user_id,
        duplicates=duplicates,
    )

    job.meta["status_message"] = "Done with duplicate finding!"
    job.save_meta()

    return output_dto
