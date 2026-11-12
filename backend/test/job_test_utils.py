"""Jobs held on queues of the test Redis that no background worker listens to, and
run on demand in this process through the real job handler."""

import signal
from collections.abc import Generator
from contextlib import contextmanager

import rq
from redis import Redis
from rq import SimpleWorker

from common.job_type_enum import JobType
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService

# no held queue starts with "gpu": the job handler would take its GPU branch
_HELD_PREFIX = "held"
_RUN_QUEUE = f"{_HELD_PREFIX}-run"


class HeldJobs:
    """The jobs started while the fixture is active. `JobService.start_job` runs
    as it is (validation, enrichment, enqueue), but on queues no background
    worker listens to, so the jobs wait until the test runs them."""

    def __init__(self, queues: list[rq.Queue]) -> None:
        self._queues = queues
        conn = queues[0].connection
        self._run_queue = rq.Queue(name=_RUN_QUEUE, connection=conn)

    def jobs(
        self, job_type: JobType | None = None
    ) -> list[tuple[JobType, JobInputBase]]:
        """The held jobs (of `job_type`) with their enriched input, in the order
        they were started."""
        held = sorted(
            (job for queue in self._queues for job in queue.get_jobs()),
            key=lambda job: job.enqueued_at or job.created_at,
        )
        return [
            (job.kwargs["jobtype"], job.kwargs["payload"])
            for job in held
            if job_type is None or job.kwargs["jobtype"] == job_type
        ]

    def inputs(self, job_type: JobType) -> list[JobInputBase]:
        """The enriched inputs of the held jobs of `job_type`."""
        return [payload for _, payload in self.jobs(job_type)]

    def run(self, *job_types: JobType) -> None:
        """Run the held jobs of `job_types` (all if none is given) in an
        in-process worker through the real job handler, the hooks included,
        until none is held: jobs they start are held and run too if their type
        matches. A failing job does not raise here; its `failed` hook runs."""
        while picked := self._next(job_types):
            queue, job = picked
            queue.remove(job)
            self._run_queue.enqueue_job(job)
            self._work()

    def _next(
        self, job_types: tuple[JobType, ...]
    ) -> tuple[rq.Queue, rq.job.Job] | None:
        candidates = [
            (queue, job)
            for queue in self._queues
            for job in queue.get_jobs()
            if not job_types or job.kwargs["jobtype"] in job_types
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda c: c[1].enqueued_at or c[1].created_at)

    def _work(self) -> None:
        """Run the run queue empty, keeping the signal handlers of pytest."""
        handlers = {s: signal.getsignal(s) for s in (signal.SIGINT, signal.SIGTERM)}
        try:
            SimpleWorker([self._run_queue], connection=self._run_queue.connection).work(
                burst=True, logging_level="WARNING"
            )
        finally:
            for s, handler in handlers.items():
                signal.signal(s, handler)

    def empty(self) -> None:
        for queue in (*self._queues, self._run_queue):
            queue.empty()


def hold_jobs() -> Generator[HeldJobs, None, None]:
    """Point `JobService().queues` at held queues while the generator is open."""
    js = JobService()
    original = js.queues
    held = {
        key: rq.Queue(name=f"{_HELD_PREFIX}-{queue.name}", connection=queue.connection)
        for key, queue in original.items()
    }
    held_jobs = HeldJobs(list(held.values()))
    js.queues = held
    try:
        yield held_jobs
    finally:
        js.queues = original
        held_jobs.empty()


@contextmanager
def unreachable_redis() -> Generator[None, None, None]:
    """Point `JobService().queues` at a Redis that cannot be reached while the
    context is open, so every `start_job` fails like when Redis is down."""
    js = JobService()
    original = js.queues
    down = Redis(host="localhost", port=1, socket_connect_timeout=1)
    js.queues = {
        key: rq.Queue(name=queue.name, connection=down)
        for key, queue in original.items()
    }
    try:
        yield
    finally:
        js.queues = original
