from typing import Any, Callable, List, Tuple

from common.job_type_enum import JobType


class LoopBranchOperator:
    def __init__(
        self,
        loop_variable: Callable[[Any], List[Any]],
        next_jobs: List[Tuple[Callable, JobType]],
    ):
        self.loop_variable = loop_variable
        self.next_jobs = next_jobs

    def get_next_jobs(self, input, output):
        items = self.loop_variable(output)
        jobs = []
        for idx, item in enumerate(items):
            for transition_fn, job_type in self.next_jobs:
                jobs.append((transition_fn, job_type, idx))
        return jobs
