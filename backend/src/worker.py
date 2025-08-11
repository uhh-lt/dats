import sys
from os import environ

import redis
from config import conf
from loguru import logger
from rq import SimpleWorker
from rq.worker_pool import WorkerPool
from utils.import_utils import import_by_suffix

r_host = conf.redis.host
r_port = conf.redis.port
r_pass = conf.redis.password
rq_idx = conf.redis.rq_idx

redis_conn = redis.Redis(host=r_host, port=r_port, db=rq_idx, password=r_pass)
try:
    assert redis_conn.ping(), (
        f"Couldn't connect to Redis {str(redis_conn)} DB #{rq_idx} at {r_host}:{r_port}!"
    )
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    if len(sys.argv) > 1 and sys.argv[1] == "healthcheck":
        sys.exit(1)
    raise
logger.info(f"Successfully connected to Redis {str(redis_conn)} DB #{rq_idx}")


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


def do_work():
    from rq import Queue

    # import all expensive stuff before forking, so that imports are only done once
    import_by_suffix("_repo.py")
    import_by_suffix("_service.py")
    import_by_suffix("_orm.py")
    import_by_suffix("_crud.py")

    # import doc_processing_pipeline
    import modules.doc_processing.doc_processing_pipeline  # noqa: F401

    queues = [
        Queue("high", connection=redis_conn),
        Queue("default", connection=redis_conn),
        Queue("low", connection=redis_conn),
    ]

    worker = WorkerPool(
        queues,
        connection=redis_conn,
        num_workers=int(environ.get("NUM_RQ_WORKER", "1")),
        worker_class=SimpleWorker,
    )
    worker.start


if __name__ == "__main__":
    if len(sys.argv) == 2:
        if sys.argv[1] == "healthcheck":
            do_healthcheck()
        elif sys.argv[1] == "work":
            do_work()
        else:
            print("Usage: worker.py [healthcheck|work]")
            sys.exit(1)
    else:
        print("Usage: worker.py [healthcheck|work]")
        sys.exit(1)
