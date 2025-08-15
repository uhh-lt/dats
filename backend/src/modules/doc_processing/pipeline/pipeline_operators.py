from typing import Any, Callable, Dict, List, Tuple

from common.job_type import JobType


class SwitchCaseBranchOperator:
    def __init__(
        self,
        switch_variable: Callable[[Any], Any],
        cases: Dict[Any, List[Tuple[Callable, JobType]]],
    ):
        self.switch_variable = switch_variable
        self.cases = cases

    def get_next_jobs(self, input, output):
        key = self.switch_variable(output)
        return self.cases.get(key, [])


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
