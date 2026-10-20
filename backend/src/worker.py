import multiprocessing as mp
import os
import signal
import sys
from os import environ

from loguru import logger
from rq import SimpleWorker, Worker
from rq.worker_pool import WorkerPool

from bootstrap import (
    close_repos,
    connect_repos,
    init_logging,
    init_services,
    register_jobs,
)
from repos.redis_repo import RedisRepo
from repos.repo_base import RepoBase
from utils.import_utils import import_by_suffix

init_logging()


# ==============================================================================
# CUSTOM WORKER CLASSES
# ==============================================================================
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
    import modules.doc_processing.doc_processing_pipeline  # noqa: F401


class DATSWorker(Worker):
    """Custom standard worker (forks per job - used for GPU).

    The parent worker deliberately does NOT connect any repos. RQ forks a
    "horse" process per job; if the parent held open DB/Redis sockets, fork()
    would copy them into every horse, letting the real connection count exceed
    the configured pool size. Instead, each horse connects its own repos on
    entry and disposes them on exit, so the parent holds zero connections.
    """

    def main_work_horse(self, job, queue):
        """Horse entry point: connect its own repos, then run the job.

        RQ's main_work_horse() ends with os._exit(), which reclaims all of the
        horse's connections/sockets, so no explicit teardown is needed (or run).
        """
        _start_job_process()
        super().main_work_horse(job, queue)


class DATSSimpleWorker(SimpleWorker):
    """Custom simple worker (does NOT fork per job - used for CPU/API)"""

    def work(self, *args, **kwargs):
        repos = _start_job_process()
        try:
            super().work(*args, **kwargs)
        finally:
            close_repos(repos)


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
