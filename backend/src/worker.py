import multiprocessing as mp
import os
import signal
import sys
from os import environ

from loguru import logger
from rq import SimpleWorker, Worker
from rq.worker_pool import WorkerPool

from repos.redis_repo import RedisRepo
from utils.import_utils import import_by_suffix

redis_conn = RedisRepo().redis_connection()


def do_healthcheck():
    try:
        rq_workers = redis_conn.smembers("rq:workers")
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


def do_work(device: str):
    # import all expensive stuff before forking, so that imports are only done once
    import_by_suffix("_repo.py")
    import_by_suffix("_service.py")
    import_by_suffix("_orm.py")
    import_by_suffix("_dto.py")
    import_by_suffix("_crud.py")
    import_by_suffix("_job.py")
    # import doc_processing_pipeline
    import modules.doc_processing.doc_processing_pipeline  # noqa: F401

    ctx = mp.get_context("fork")

    if device not in ["cpu", "gpu", "dev"]:
        print("Usage: worker.py healthcheck or worker.py work [cpu|gpu|dev]")
        sys.exit(1)

    processes = []

    # handle SIGTERM and SIGINT
    def cleanup(signum, frame):
        logger.info(f"Parent received signal {signum}. Stopping children...")
        for p in processes:
            if p.is_alive():
                logger.info(f"Terminating child process {p.name}...")
                p.terminate()  # Sends SIGTERM to the child (create_pool)

        # Wait for children to finish cleaning up
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

    queues = [
        Queue(f"{queue_name}-high", connection=redis_conn),
        Queue(f"{queue_name}-default", connection=redis_conn),
        Queue(f"{queue_name}-low", connection=redis_conn),
    ]

    worker_pool = WorkerPool(
        queues,
        connection=redis_conn,
        num_workers=num_workers,
        worker_class=Worker if "gpu" == queue_name else SimpleWorker,
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


def stop_work(device: str):
    """
    Gracefully stops workers associated with the given device configuration.
    Strategy:
    1. Identify target queue prefixes based on 'device'.
    2. Fetch all workers from Redis.
    3. Filter for workers listening to the target queues.
    4. Send SIGINT (Warm Shutdown) to their PIDs.
    """
    target_prefixes = []
    if device == "cpu":
        # 'cpu' command starts both CPU and API pools
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
        # Fetch all workers registered in Redis
        workers = Worker.all(connection=redis_conn)
        stopped_count = 0

        for worker in workers:
            # Check if this worker listens to any of our target queues
            # worker.queues is a list of Queue objects
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
                    # SIGINT triggers a Warm Shutdown in RQ (finish job, then exit)
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
