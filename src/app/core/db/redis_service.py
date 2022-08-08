import redis
from loguru import logger

from app.util.singleton_meta import SingletonMeta
from config import conf


class RedisService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # setup redis
            r_host = conf.backend.redis.host
            r_port = conf.backend.redis.port

            # setup clients
            clients = {}
            for client, db_idx in conf.backend.redis.clients.items():
                clients[client.lower()] = redis.Redis(host=r_host, port=r_port, db=db_idx)
                assert clients[client].ping(), \
                    f"Couldn't connect to Redis {str(client)} DB #{db_idx} at {r_host}:{r_port}!"
                logger.info(f"Successfully connected to Redis {str(client)} DB #{db_idx}")
            cls.__clients = clients
        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

    def shutdown(self) -> None:
        logger.info("Shutting down Redis Service!")
        for client in self.__clients.values():
            client.close()

    def _get_client(self, typ: str):
        if not typ.lower() in self.__clients:
            raise KeyError(f"Redis Client '{typ.lower()}' does not exist!")
        return self.__clients[typ.lower()]

    def _flush_client(self, typ: str):
        client = self._get_client(typ)
        logger.warning(f"Flushing Redis Client DB '{typ}'!")
        client.flushdb()
        client.save()
