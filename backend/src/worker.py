import multiprocessing as mp
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

    worker = WorkerPool(
        queues,
        connection=redis_conn,
        num_workers=num_workers,
        worker_class=Worker if "gpu" == queue_name else SimpleWorker,
    )
    worker.start()


if __name__ == "__main__":
    if len(sys.argv) == 2:
        if sys.argv[1] == "healthcheck":
            do_healthcheck()
        else:
            print("Usage: worker.py healthcheck or worker.py work [cpu|gpu|dev]")
            sys.exit(1)
    elif len(sys.argv) == 3:
        if sys.argv[1] == "work":
            do_work(sys.argv[2])
        else:
            print("Usage: worker.py healthcheck or worker.py work [cpu|gpu|dev]")
            sys.exit(1)
    else:
        print("Usage: worker.py healthcheck or worker.py work [cpu|gpu|dev]")
        sys.exit(1)
