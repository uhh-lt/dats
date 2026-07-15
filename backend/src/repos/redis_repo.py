import redis
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class RedisRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize RedisRepo.
        """
        RepoBase.__init__(self)
        self._redis_conn: redis.Redis | None = None

    def connect(self) -> None:
        """Establish connection to Redis."""
        if self._redis_conn is not None:
            logger.debug("RedisRepo already connected, skipping")
            return

        try:
            r_host = conf.redis.host
            r_port = conf.redis.port
            r_pass = conf.redis.password.get_secret_value()
            rq_idx = conf.redis.rq_idx

            self._redis_conn = redis.Redis(
                host=r_host, port=r_port, db=rq_idx, password=r_pass
            )
            assert self._redis_conn.ping(), (
                f"Couldn't connect to Redis {str(self._redis_conn)} "
                f"DB #{rq_idx} at {r_host}:{r_port}!"
            )
            logger.info(
                f"Successfully connected to Redis ({r_host}:{r_port}) DB #{rq_idx}"
            )

        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def close_connection(self) -> None:
        """Close the connection to Redis."""
        if self._redis_conn is None:
            logger.debug("RedisRepo already closed, skipping")
            return

        logger.info("Closing connection to Redis...")
        self._redis_conn.close()
        self._redis_conn = None

    def remove_data(self) -> None:
        """Reset/clear all Redis data (flush all databases)."""
        if self._redis_conn is None:
            raise RuntimeError("RedisRepo is not connected. Call connect() first.")

        logger.warning("Dropping the redis database!")
        self._redis_conn.flushdb(asynchronous=False)
        logger.info("Redis data reset")

    def redis_connection(self) -> redis.Redis:
        """Return the Redis connection"""
        if self._redis_conn is None:
            raise RuntimeError("RedisRepo is not connected. Call connect() first.")
        return self._redis_conn
