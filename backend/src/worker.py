import inspect
import multiprocessing as mp
import os
import signal
import sys
from os import environ

from loguru import logger
from rq import SimpleWorker, Worker
from rq.worker_pool import WorkerPool

from repos.redis_repo import RedisRepo
from repos.repo_base import RepoBase
from utils.import_utils import import_by_suffix
from utils.logger import setup_logging

setup_logging()


# ==============================================================================
# CUSTOM WORKER CLASSES
# ==============================================================================
def init_repos_and_services() -> list[RepoBase]:
    """Dynamically init all repos (connecting them) and init services."""
    logger.info(
        f"Worker {os.getpid()} initializing repository connections & services..."
    )
    repos = []
    repo_modules = import_by_suffix("_repo.py")
    repo_modules.sort(key=lambda x: x.__name__.split(".")[-1])
    for module in repo_modules:
        for name, cls in inspect.getmembers(module, inspect.isclass):
            if (
                issubclass(cls, RepoBase)
                and cls is not RepoBase
                and cls.__module__ == module.__name__
            ):
                repo_instance = cls()
                repo_instance.connect()
                repos.append(repo_instance)

    # Setup services lazily
    from systems.job_system.job_service import JobService

    JobService().initialize()

    return repos


def teardown_repos_and_services(repos: list[RepoBase]):
    """Safely closes all connections."""
    logger.info(f"Worker {os.getpid()} stopping. Cleaning up resources...")

    for repo in repos:
        try:
            logger.info(f"Closing {repo.__class__.__name__}...")
            repo.close_connection()
        except Exception as e:
            logger.error(f"Failed to close {repo.__class__.__name__}: {e}")


class DATSWorker(Worker):
    """Custom standard worker (forks per job - used for GPU).

    The parent worker deliberately does NOT connect any repos. RQ forks a
    "horse" process per job; if the parent held open DB/Redis sockets, fork()
    would copy them into every horse, letting the real connection count exceed
    the configured pool size. Instead, each horse connects its own repos on
    entry and disposes them on exit, so the parent holds zero connections.

    CUDA self-healing: if jobs keep failing because CUDA became unavailable
    (a transient driver/runtime fault that only a process restart fixes), the
    worker exits non-zero after MAX_CONSECUTIVE_CUDA_FAILURES in a row so that
    Docker's restart policy recreates a clean worker instead of failing every
    subsequent GPU job until manual intervention.
    """

    MAX_CONSECUTIVE_CUDA_FAILURES = 2

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._consecutive_cuda_failures = 0

    def handle_job_success(self, job, queue, started_job_registry):
        self._consecutive_cuda_failures = 0
        super().handle_job_success(job, queue, started_job_registry)

    def handle_job_failure(self, job, queue, started_job_registry=None, exc_string=""):
        from systems.job_system.cuda_utils import CUDA_UNAVAILABLE_REASON

        if CUDA_UNAVAILABLE_REASON in (exc_string or ""):
            self._consecutive_cuda_failures += 1
            logger.warning(
                f"CUDA-unavailable job failure "
                f"{self._consecutive_cuda_failures}/"
                f"{self.MAX_CONSECUTIVE_CUDA_FAILURES} on worker {self.name}."
            )
        else:
            self._consecutive_cuda_failures = 0

        super().handle_job_failure(job, queue, started_job_registry, exc_string)

        if self._consecutive_cuda_failures >= self.MAX_CONSECUTIVE_CUDA_FAILURES:
            logger.error(
                f"CUDA unavailable for {self._consecutive_cuda_failures} "
                "consecutive GPU jobs. Exiting worker so the container runtime "
                "restarts it into a clean state."
            )
            os._exit(1)

    def main_work_horse(self, job, queue):
        """Horse entry point: connect its own repos, then run the job.

        RQ's main_work_horse() ends with os._exit(), which reclaims all of the
        horse's connections/sockets, so no explicit teardown is needed (or run).
        """
        init_repos_and_services()
        super().main_work_horse(job, queue)


class DATSSimpleWorker(SimpleWorker):
    """Custom simple worker (does NOT fork per job - used for CPU/API)"""

    def work(self, *args, **kwargs):
        repos = init_repos_and_services()
        try:
            super().work(*args, **kwargs)
        finally:
            teardown_repos_and_services(repos)


# ==============================================================================
# COMMAND: work
# ==============================================================================
def do_work(device: str):
    # import all expensive stuff before forking, so that imports are only done once
    # (Hollow Singletons are instantiated here, but NOT connected yet!)
    import_by_suffix("_repo.py")
    import_by_suffix("_service.py")
    import_by_suffix("_orm.py")
    import_by_suffix("_dto.py")
    import_by_suffix("_crud.py")
    import_by_suffix("_job.py")
    import modules.doc_processing.doc_processing_pipeline  # noqa: F401

    ctx = mp.get_context("fork")

    if device not in ["cpu", "gpu", "dev"]:
        print("Usage: worker.py healthcheck or worker.py work [cpu|gpu|dev]")
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
def do_healthcheck():
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
        print("Usage: worker.py [healthcheck | work <mode> | stop <mode>]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "healthcheck":
        do_healthcheck()
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
        print("Usage: worker.py [healthcheck | work <mode> | stop <mode>]")
    sys.exit(1)
