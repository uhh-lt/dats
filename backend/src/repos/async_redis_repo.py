import asyncio

import redis
import redis.asyncio as aioredis
from loguru import logger

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class AsyncRedisRepo(RepoBase, metaclass=SingletonMeta):
    """
    Async Redis connection for websocket pub/sub.

    Separate from `RedisRepo` (which holds the sync connection used by RQ):
    it uses a dedicated logical DB index (`ws_idx`) so that flushing the RQ
    database (`rq_idx`) never affects pub/sub state.

    Like all repos, it is auto-discovered and connected by the central repo
    setup in `main.py` / `worker.py`. Note that `connect()` only constructs
    the client (which is synchronous); the connection is established lazily
    on first use by the async consumer (the websocket manager).
    """

    def __init__(self):
        RepoBase.__init__(self)
        self._redis_conn: aioredis.Redis | None = None

    def connect(self) -> None:
        """Create the async Redis client (idempotent)."""
        if self._redis_conn is not None:
            logger.debug("AsyncRedisRepo already connected, skipping")
            return

        r_host = conf.redis.host
        r_port = conf.redis.port
        r_pass = conf.redis.password.get_secret_value()
        ws_idx = conf.redis.ws_idx

        self._redis_conn = aioredis.Redis(
            host=r_host,
            port=r_port,
            db=ws_idx,
            password=r_pass,
            decode_responses=True,
        )
        logger.info(f"Created async Redis client ({r_host}:{r_port}) DB #{ws_idx}")

    def close_connection(self) -> None:
        """
        Close the async Redis connection (idempotent).

        `redis.asyncio.Redis.aclose()` is a coroutine, but `close_connection`
        must be sync (it runs in both sync worker and async API contexts).
        In async contexts (API lifespan shutdown) the central teardown awaits
        `aclose_connection()` instead, so this sync path only runs where no
        event loop is running (sync worker teardown) and we can drive the
        coroutine with `asyncio.run()`. The websocket manager is shut down
        before repos are closed, so there are no in-flight operations.
        """
        if self._redis_conn is None:
            logger.debug("AsyncRedisRepo already closed, skipping")
            return

        logger.info("Closing async connection to Redis...")
        try:
            asyncio.run(self._redis_conn.aclose())
        except Exception as e:
            logger.warning(f"Error while closing async Redis connection: {e}")
        self._redis_conn = None

    async def aclose_connection(self) -> None:
        """
        Async variant of `close_connection()` for async teardown contexts
        (the FastAPI lifespan shutdown awaits this before the sync loop).
        """
        if self._redis_conn is None:
            logger.debug("AsyncRedisRepo already closed, skipping")
            return

        logger.info("Closing async connection to Redis...")
        try:
            await self._redis_conn.aclose()
        except Exception as e:
            logger.warning(f"Error while closing async Redis connection: {e}")
        self._redis_conn = None

    def remove_data(self) -> None:
        """Reset/clear the websocket pub/sub database."""
        if self._redis_conn is None:
            raise RuntimeError("AsyncRedisRepo is not connected. Call connect() first.")

        logger.warning("Dropping the async redis database!")
        # flushdb is a coroutine on the async client, so we use a throwaway
        # sync client on the same DB index instead.
        sync_conn = redis.Redis(
            host=conf.redis.host,
            port=conf.redis.port,
            db=conf.redis.ws_idx,
            password=conf.redis.password.get_secret_value(),
        )
        sync_conn.flushdb(asynchronous=False)
        sync_conn.close()
        logger.info("Async Redis data reset")

    def redis_connection(self) -> aioredis.Redis:
        """Return the async Redis connection."""
        if self._redis_conn is None:
            raise RuntimeError("AsyncRedisRepo is not connected. Call connect() first.")
        return self._redis_conn
