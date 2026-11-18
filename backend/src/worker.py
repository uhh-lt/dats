import multiprocessing as mp
import os
import signal
import sys
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from os import environ

import rq
from loguru import logger
from rq import SimpleWorker, Worker
from rq.exceptions import AbandonedJobError
from rq.worker.base import WorkerStatus
from rq.worker_pool import WorkerPool

from bootstrap import (
    close_repos,
    connect_repos,
    init_logging,
    init_services,
    register_jobs,
)
from repos.db.sql_repo import SQLRepo
from repos.redis_repo import RedisRepo
from repos.repo_base import RepoBase
from systems.job_system.job_exceptions import JobStoppedError
from systems.job_system.job_handler import STOP_SIGNAL
from systems.job_system.job_system_enum import JobTiming
from utils.import_utils import import_by_suffix

init_logging()


# ==============================================================================
# CUSTOM WORKER CLASSES
# ==============================================================================

# The TTL of the heartbeat of a job that a simple worker runs, renewed every
# monitoring interval: once the worker died, the job is failed after it. It is
# generous, so a short stall of Redis or of the renewing thread (e.g. the GIL
# held by the job) never fails a live job, which a retry would then run twice.
HEARTBEAT_TTL = int(JobTiming.TEN_MINUTES)


def _start_job_process() -> list[RepoBase]:
    """Startup of a process that executes jobs: register the jobs, connect all
    repos and init the services. Returns the connected repos."""
    register_jobs()
    repos = connect_repos()
    init_services()
    return repos


def _preload_modules() -> None:
    """Import all expensive modules once in the parent process, so the forked
    job processes inherit them instead of importing them again. The repos are
    instantiated (hollow singletons) but NOT connected."""
    register_jobs()
    for suffix in ["_repo.py", "_service.py", "_orm.py", "_dto.py", "_crud.py"]:
        import_by_suffix(suffix)
    import systems.artefact_system.step_execution  # noqa: F401


@contextmanager
def _sql_connection() -> Iterator[None]:
    """Connect the SQL repo for the duration of the block and close it again."""
    sqlr = SQLRepo()
    sqlr.connect()
    try:
        yield
    finally:
        sqlr.close_connection()


class DATSWorker(Worker):
    """Custom standard worker (forks per job - used for GPU).

    The parent worker deliberately does NOT connect any repos. RQ forks a
    "horse" process per job; if the parent held open DB/Redis sockets, fork()
    would copy them into every horse, letting the real connection count exceed
    the configured pool size. Instead, each horse connects its own repos on
    entry and disposes them on exit, so the parent holds zero connections.
    The parent runs the failure callback of a job whose horse died, and of the
    jobs of dead workers in its maintenance; it connects the database only for
    them.
    """

    def prepare_execution(self, job):
        """RQ remembers a stop (`_stopped_job_id`) until the job it stopped
        failed. A stop that came when its job had ended already would make a
        later failure of the job (e.g. after a retry) a stop, and the horse,
        which inherits it, would run the failure callback twice: forget it
        before each execution."""
        self._stopped_job_id = None
        return super().prepare_execution(job)

    def handle_work_horse_killed(self, job, retpid, ret_val, rusage):
        """RQ fails the job of a dead horse without its failure callback: run
        it here, so the job's `failed` hook runs like for any failed job."""
        super().handle_work_horse_killed(job, retpid, ret_val, rusage)
        with _sql_connection():
            job.execute_failure_callback(
                self.death_penalty_class,
                AbandonedJobError,
                AbandonedJobError(f"The job process died ({ret_val})"),
                None,
            )

    def handle_job_failure(self, job, queue, started_job_registry=None, exc_string=""):
        """RQ ends a job it stopped (`JobService.stop_job`) by killing its horse,
        without its failure callback: run it here, so the job runs its `failed`
        hook and publishes its STOPPED state."""
        if self._stopped_job_id == job.id:
            with _sql_connection():
                job.execute_failure_callback(
                    self.death_penalty_class, JobStoppedError, JobStoppedError(), None
                )
        super().handle_job_failure(job, queue, started_job_registry, exc_string)

    def clean_registries(self):
        """The cleanup of the started jobs runs the failure callback of the jobs
        whose worker died."""
        with _sql_connection():
            super().clean_registries()

    def main_work_horse(self, job, queue):
        """Horse entry point: connect its own repos, then run the job.

        RQ's main_work_horse() ends with os._exit(), which reclaims all of the
        horse's connections/sockets, so no explicit teardown is needed (or run).
        """
        _start_job_process()
        super().main_work_horse(job, queue)


class DATSSimpleWorker(SimpleWorker):
    """Custom simple worker (does NOT fork per job - used for CPU/API).

    RQ's simple worker keeps the heartbeat of its job alive for the job's whole
    timeout, as nothing renews it while the job runs in its main thread: the job
    of a killed worker stays STARTED until its timeout passed (days for the LLM
    Assistant), and cannot be retried meanwhile. This worker gives the
    heartbeats of the job and its entry in the started registry a TTL of
    `HEARTBEAT_TTL` and renews them, and the heartbeat of the worker, from a
    thread every monitoring interval, so the cleanup of the started jobs fails
    the job of a killed worker within minutes (`job_handler.rq_job_failed`).
    """

    _job_ended: threading.Event | None = None
    _heartbeat_renewer: threading.Thread | None = None

    def get_heartbeat_ttl(self, job: rq.job.Job) -> int:
        return HEARTBEAT_TTL

    def execute_job(self, job: rq.job.Job, queue: rq.Queue) -> None:
        """Run the job as RQ's simple worker does, while a thread renews its
        heartbeats until its execution ended."""
        self.prepare_execution(job)
        self._job_ended = threading.Event()
        self._heartbeat_renewer = threading.Thread(
            target=self._renew_heartbeats,
            args=(job, self._job_ended),
            name=f"heartbeat-{job.id}",
            daemon=True,
        )
        self._heartbeat_renewer.start()
        try:
            self.perform_job(job, queue)
        finally:
            self._stop_renewing_heartbeats()
        self.set_state(WorkerStatus.IDLE)

    def handle_execution_ended(
        self, job: rq.job.Job, queue: rq.Queue, heartbeat_ttl: int
    ) -> None:
        # RQ calls it once the job returned or raised, before it ends the
        # execution: a renewal afterwards would recreate what the end removed
        self._stop_renewing_heartbeats()
        super().handle_execution_ended(job, queue, heartbeat_ttl)

    def _renew_heartbeats(self, job: rq.job.Job, ended: threading.Event) -> None:
        """Renew the heartbeats every `job_monitoring_interval` seconds, as the
        forking worker does while it waits for its job process."""
        started = time.monotonic()
        while not ended.wait(self.job_monitoring_interval):
            try:
                self.set_current_job_working_time(time.monotonic() - started)
                self.maintain_heartbeats(job)
            except Exception as e:
                logger.warning(f"Cannot renew the heartbeat of job {job.id}: {e}")

    def _stop_renewing_heartbeats(self) -> None:
        if self._job_ended is None or self._heartbeat_renewer is None:
            return
        self._job_ended.set()
        self._heartbeat_renewer.join()
        self._job_ended = None
        self._heartbeat_renewer = None

    def prepare_execution(self, job):
        """RQ remembers a stop (`_stopped_job_id`) until the job it stopped
        failed. A stop that came when its job had ended already would make a
        later failure of the job (e.g. after a retry) a stop: forget it before
        each execution."""
        self._stopped_job_id = None
        return super().prepare_execution(job)

    def work(self, *args, **kwargs):
        # the stop signal only interrupts a running job (`job_handler._stoppable`)
        signal.signal(STOP_SIGNAL, signal.SIG_IGN)
        repos = _start_job_process()
        try:
            super().work(*args, **kwargs)
        finally:
            close_repos(repos)

    def kill_horse(self, sig: signal.Signals = signal.SIGKILL) -> None:
        """RQ stops a job (`JobService.stop_job`) by killing the horse that runs
        it, but this worker runs its job itself: interrupt the job instead. The
        job raises `JobStoppedError`, RQ runs its failure callback and ends it
        as STOPPED. RQ calls this from the thread that receives the stop
        command; the signal goes to the main thread, which runs the job, so it
        also interrupts a blocking call."""
        main_thread_id = threading.main_thread().ident
        assert main_thread_id is not None
        signal.pthread_kill(main_thread_id, STOP_SIGNAL)


# ==============================================================================
# COMMAND: work
# ==============================================================================
def do_work(device: str):
    _preload_modules()

    ctx = mp.get_context("fork")

    if device not in ["cpu", "gpu", "dev"]:
        print("Usage: worker.py healthcheck [gpu] or worker.py work [cpu|gpu|dev]")
        sys.exit(1)

    processes = []

    def cleanup(signum, frame):
        logger.info(f"Parent received signal {signum}. Stopping children...")
        for p in processes:
            if p.is_alive():
                logger.info(f"Terminating child process {p.name}...")
                p.terminate()
        for p in processes:
            p.join()
        logger.info("All children stopped. Parent exiting.")
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    if device == "cpu" or device == "dev":
        cpu = ctx.Process(
            target=create_pool, args=("cpu", int(environ.get("RQ_WORKERS_CPU", "8")))
        )
        api = ctx.Process(
            target=create_pool, args=("api", int(environ.get("RQ_WORKERS_API", "16")))
        )
        processes.append(cpu)
        processes.append(api)

    if device == "gpu" or device == "dev":
        gpu = ctx.Process(
            target=create_pool, args=("gpu", int(environ.get("RQ_WORKERS_GPU", "1")))
        )
        processes.append(gpu)

    for p in processes:
        p.start()

    for p in processes:
        p.join()


def create_pool(queue_name: str, num_workers: int):
    from rq import Queue

    RedisRepo().connect()
    redis_conn = RedisRepo().redis_connection()

    queues = [
        Queue(f"{queue_name}-high", connection=redis_conn),
        Queue(f"{queue_name}-default", connection=redis_conn),
        Queue(f"{queue_name}-low", connection=redis_conn),
    ]

    worker_class = DATSWorker if queue_name == "gpu" else DATSSimpleWorker

    worker_pool = WorkerPool(
        queues,
        connection=redis_conn,
        num_workers=num_workers,
        worker_class=worker_class,
    )

    def cleanup(signum, frame):
        logger.info(
            f"Pool '{queue_name}' received signal {signum}. Stopping workers..."
        )
        try:
            worker_pool.stop_workers()
        except Exception as e:
            logger.error(f"Error stopping worker pool: {e}")
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    logger.info(f"Starting pool {queue_name} with {num_workers} workers")
    worker_pool.start()


# ==============================================================================
# COMMAND: stop
# ==============================================================================
def stop_work(device: str):
    target_prefixes = []
    if device == "cpu":
        target_prefixes = ["cpu", "api"]
    elif device == "gpu":
        target_prefixes = ["gpu"]
    elif device == "dev":
        target_prefixes = ["cpu", "api", "gpu"]
    else:
        print(f"Unknown device: {device}. Usage: worker.py stop [cpu|gpu|dev]")
        sys.exit(1)

    logger.info(
        f"Attempting to stop workers listening to prefixes: {target_prefixes}..."
    )

    try:
        RedisRepo().connect()
        workers = Worker.all(connection=RedisRepo().redis_connection())
        stopped_count = 0

        for worker in workers:
            is_target_worker = False
            for queue in worker.queues:
                if any(queue.name.startswith(prefix) for prefix in target_prefixes):
                    is_target_worker = True
                    break

            if is_target_worker and worker.pid is not None:
                try:
                    logger.info(
                        f"Sending SIGINT to worker {worker.name} (PID {worker.pid})..."
                    )
                    os.kill(worker.pid, signal.SIGTERM)
                    worker.request_stop(signal.SIGTERM, None)
                    stopped_count += 1
                except ProcessLookupError:
                    logger.warning(f"PID {worker.pid} not found (already dead?)")
                except Exception as e:
                    logger.error(
                        f"Could not stop worker {worker.name} (PID {worker.pid}): {e}"
                    )

        if stopped_count > 0:
            logger.success(f"Successfully sent stop signal to {stopped_count} workers.")
        else:
            logger.warning("No active workers found matching those queues.")

    except Exception as e:
        logger.error(f"Failed to execute stop_work: {e}")
        sys.exit(1)


# ==============================================================================
# COMMAND: healthcheck
# ==============================================================================
def gpu_is_reachable() -> bool:
    """Check that the container can still access its GPUs.

    A container can lose its /dev/nvidia* devices while running (e.g. after a
    `systemctl daemon-reload` with the legacy nvidia device driver), then every GPU
    job fails. nvidia-smi detects that ("Failed to initialize NVML: Unknown Error")
    without initializing CUDA in this process.
    """
    import subprocess

    try:
        result = subprocess.run(
            ["nvidia-smi", "-L"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            timeout=8,
        )
    except Exception as e:
        logger.error(f"GPU healthcheck failed: nvidia-smi raised {e!r}")
        return False
    if result.returncode != 0:
        logger.error(f"GPU healthcheck failed: {result.stdout.strip()}")
        return False
    return True


def do_healthcheck(require_gpu: bool = False):
    if require_gpu and not gpu_is_reachable():
        sys.exit(1)
    try:
        RedisRepo().connect()
        rq_workers = RedisRepo().redis_connection().smembers("rq:workers")
        num_workers = len(rq_workers)  # type: ignore
        if num_workers > 0:
            logger.info(f"Found {num_workers} RQ workers")
            sys.exit(0)
        else:
            logger.error("No active RQ worker found")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Healthcheck failed: {e}")
        sys.exit(1)


# ==============================================================================
# Entrypoint
# ==============================================================================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: worker.py [healthcheck [gpu] | work <mode> | stop <mode>]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "healthcheck":
        if len(sys.argv) == 3 and sys.argv[2] != "gpu":
            print("Usage: worker.py healthcheck [gpu]")
            sys.exit(1)
        do_healthcheck(require_gpu=len(sys.argv) == 3)
    elif command == "work":
        if len(sys.argv) == 3:
            do_work(sys.argv[2])
        else:
            print("Usage: worker.py work [cpu|gpu|dev]")
            sys.exit(1)
    elif command == "stop":
        if len(sys.argv) == 3:
            stop_work(sys.argv[2])
        else:
            print("Usage: worker.py stop [cpu|gpu|dev]")
            sys.exit(1)
    else:
        print(f"Unknown command: {command}")
        print("Usage: worker.py [healthcheck [gpu] | work <mode> | stop <mode>]")
    sys.exit(1)
