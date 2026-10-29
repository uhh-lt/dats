"""Jobs whose stored input or output no longer matches their job types are skipped."""

from typing import Any, cast

import pytest
import rq
from pydantic import Field

from systems.job_system.job_dto import JobInputBase, JobOutputBase
from systems.job_system.job_service import JobService, RegisteredJob


class FooInput(JobInputBase):
    sdoc_ids: list[int] = Field(description="IDs of the documents")


class FooOutput(JobOutputBase):
    num_results: int = Field(description="Number of results")


class FakeJob:
    """The parts of an rq job that `_matches_job_types` reads."""

    id = "fake-job"

    def __init__(self, payload: Any, output: Any = None) -> None:
        self._payload = payload
        self._output = output

    @property
    def kwargs(self) -> dict[str, Any]:
        if isinstance(self._payload, Exception):
            # rq unpickles the input lazily, on this access
            raise self._payload
        return {"payload": self._payload}

    def return_value(self) -> Any:
        return self._output


JOB_INFO = cast(RegisteredJob, {"input_type": FooInput, "output_type": FooOutput})


# ===========================================================================
# JOB SERVICE: STORED JOB TYPES
# ===========================================================================


@pytest.mark.parametrize(
    "job,expected",
    [
        # a job created with the current input type
        pytest.param(
            FakeJob(FooInput(project_id=1, sdoc_ids=[1])), True, id="current-input"
        ),
        # a finished job with the current input and output types
        pytest.param(
            FakeJob(FooInput(project_id=1, sdoc_ids=[1]), FooOutput(num_results=2)),
            True,
            id="current-input-and-output",
        ),
        # pickled with a class that no longer exists
        pytest.param(
            FakeJob(AttributeError("Can't get attribute 'TaggingParams'")),
            False,
            id="removed-class",
        ),
        # pickled before a required input field was added
        pytest.param(
            FakeJob(FooInput.model_construct(project_id=1)),
            False,
            id="missing-input-field",
        ),
        # finished with an output that lacks a field of the current output type
        pytest.param(
            FakeJob(FooInput(project_id=1, sdoc_ids=[1]), FooOutput.model_construct()),
            False,
            id="missing-output-field",
        ),
    ],
)
def test_job_service_skips_jobs_whose_stored_types_changed(
    job: FakeJob, expected: bool
) -> None:
    """A job is listed only if its pickled input (and output, if finished) still
    validates against the job's current input and output types."""
    assert JobService()._matches_job_types(cast(rq.job.Job, job), JOB_INFO) == expected
