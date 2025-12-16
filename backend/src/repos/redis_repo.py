import redis
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf


class RedisRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        # setup redis
        r_host = conf.redis.host
        r_port = conf.redis.port
        r_pass = conf.redis.password
        rq_idx = conf.redis.rq_idx

        cls.redis_conn = redis.Redis(
            host=r_host, port=r_port, db=rq_idx, password=r_pass
        )
        try:
            assert cls.redis_conn.ping(), (
                f"Couldn't connect to Redis {str(cls.redis_conn)} "
                f"DB #{rq_idx} at {r_host}:{r_port}!"
            )
        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)
        logger.info(
            f"Successfully connected to Redis {str(cls.redis_conn)} DB #{rq_idx}"
        )

        return super(RedisRepo, cls).__new__(cls)

    @classmethod
    def redis_connection(cls):
        """Return the Redis connection"""
        return cls.redis_conn

    @classmethod
    def drop_database(cls) -> None:
        logger.warning("Dropping the redis database!")
        cls.redis_conn.flushdb(asynchronous=False)
