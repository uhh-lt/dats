import uuid
from datetime import datetime

import redis
from common.singleton_meta import SingletonMeta
from config import conf
from loguru import logger
from modules.crawler.crawler_job_dto import (
    CrawlerJobCreate,
    CrawlerJobRead,
    CrawlerJobUpdate,
)
from modules.ml.ml_job_dto import MLJobCreate, MLJobRead, MLJobUpdate
from modules.perspectives.perspectives_job import (
    PerspectivesJobCreate,
    PerspectivesJobRead,
    PerspectivesJobUpdate,
)
from modules.trainer.trainer_job_dto import (
    TrainerJobCreate,
    TrainerJobRead,
    TrainerJobUpdate,
)


class RedisRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # setup redis
            r_host = conf.redis.host
            r_port = conf.redis.port
            r_pass = conf.redis.password

            # setup clients
            clients = {}
            for client, db_idx in conf.redis.clients.items():
                clients[client.lower()] = redis.Redis(
                    host=r_host, port=r_port, db=db_idx, password=r_pass
                )
                assert clients[client].ping(), (
                    f"Couldn't connect to Redis {str(client)} "
                    f"DB #{db_idx} at {r_host}:{r_port}!"
                )
                logger.info(
                    f"Successfully connected to Redis {str(client)} DB #{db_idx}"
                )
            cls.__clients = clients
        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        if kwargs["flush_all_clients"] if "flush_all_clients" in kwargs else False:
            logger.warning("Flushing all DATS Redis Clients!")
            for typ, client in clients.items():
                client.flushdb()
                client.save()

        return super(RedisRepo, cls).__new__(cls)

    def shutdown(self) -> None:
        logger.info("Shutting down Redis Service!")
        for client in self.__clients.values():
            client.close()

    @staticmethod
    def _generate_random_key() -> str:
        return str(uuid.uuid4())

    def _get_client(self, typ: str):
        if typ.lower() not in self.__clients:
            raise KeyError(f"Redis Client '{typ.lower()}' does not exist!")
        return self.__clients[typ.lower()]

    def flush_all_clients(self):
        logger.warning("Flushing all DATS Redis Clients!")
        for typ, client in self.__clients.items():
            client.flushdb()
            client.save()

    def _flush_client(self, typ: str):
        client = self._get_client(typ)
        logger.warning(f"Flushing Redis Client DB '{typ}'!")
        client.flushdb()
        client.save()

    def store_crawler_job(
        self, crawler_job: CrawlerJobCreate | CrawlerJobRead
    ) -> CrawlerJobRead:
        client = self._get_client("crawler")

        if isinstance(crawler_job, CrawlerJobCreate):
            key = self._generate_random_key()
            cj = CrawlerJobRead(
                id=key,
                **crawler_job.model_dump(),
                created=datetime.now(),
                updated=datetime.now(),
            )
        elif isinstance(crawler_job, CrawlerJobRead):
            key = crawler_job.id
            cj = crawler_job

        if client.set(key.encode("utf-8"), cj.model_dump_json()) != 1:
            msg = "Cannot store CrawlerJob!"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Successfully stored CrawlerJob {key}!")
        return cj

    def load_crawler_job(self, key: str) -> CrawlerJobRead:
        client = self._get_client("crawler")

        cj = client.get(key.encode("utf-8"))
        if cj is None:
            msg = f"CrawlerJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)
        logger.debug(f"Successfully loaded CrawlerJob {key}")
        return CrawlerJobRead.model_validate_json(cj)

    def update_crawler_job(self, key: str, update: CrawlerJobUpdate) -> CrawlerJobRead:
        cj = self.load_crawler_job(key=key)
        data = cj.model_dump(exclude={"updated"})
        data.update(**update.model_dump())
        cj = CrawlerJobRead(**data, updated=datetime.now())
        cj = self.store_crawler_job(crawler_job=cj)
        logger.debug(f"Updated CrawlerJob {key}")
        return cj

    def delete_crawler_job(self, key: str) -> CrawlerJobRead:
        cj = self.load_crawler_job(key=key)
        client = self._get_client("crawler")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete CrawlerJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted CrawlerJob {key}")
        return cj

    def get_all_crawler_jobs(
        self, project_id: int | None = None
    ) -> list[CrawlerJobRead]:
        client = self._get_client("crawler")
        all_crawler_jobs: list[CrawlerJobRead] = [
            self.load_crawler_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_crawler_jobs
        else:
            return [
                job
                for job in all_crawler_jobs
                if job.parameters.project_id == project_id
            ]

    def store_trainer_job(
        self, trainer_job: TrainerJobCreate | TrainerJobRead
    ) -> TrainerJobRead:
        client = self._get_client("trainer")

        if isinstance(trainer_job, TrainerJobCreate):
            key = self._generate_random_key()
            tj = TrainerJobRead(
                id=key,
                created=datetime.now(),
                updated=datetime.now(),
                **trainer_job.model_dump(),
            )
        elif isinstance(trainer_job, TrainerJobRead):
            key = trainer_job.id
            tj = trainer_job

        if client.set(key.encode("utf-8"), tj.model_dump_json()) != 1:
            msg = "Cannot store TrainerJob!"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Successfully stored TrainerJob {key}!")
        return tj

    def load_trainer_job(self, key: str) -> TrainerJobRead:
        client = self._get_client("trainer")

        tj = client.get(key.encode("utf-8"))
        if tj is None:
            msg = f"TrainerJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)
        logger.debug(f"Successfully loaded TrainerJob {key}")
        return TrainerJobRead.model_validate_json(tj)

    def update_trainer_job(self, key: str, update: TrainerJobUpdate) -> TrainerJobRead:
        tj = self.load_trainer_job(key=key)
        data = tj.model_dump()
        data.update(**update.model_dump())
        tj = TrainerJobRead(**data, updated=datetime.now())
        tj = self.store_trainer_job(trainer_job=tj)
        logger.debug(f"Updated TrainerJob {key}")
        return tj

    def delete_trainer_job(self, key: str) -> TrainerJobRead:
        tj = self.load_trainer_job(key=key)
        client = self._get_client("trainer")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete TrainerJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted TrainerJob {key}")
        return tj

    def get_all_trainer_jobs(
        self, project_id: int | None = None
    ) -> list[TrainerJobRead]:
        client = self._get_client("trainer")
        all_trainer_jobs: list[TrainerJobRead] = [
            self.load_trainer_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_trainer_jobs
        else:
            return [
                job
                for job in all_trainer_jobs
                if job.parameters.project_id == project_id
            ]

    def store_ml_job(self, ml_job: MLJobCreate | MLJobRead) -> MLJobRead:
        client = self._get_client("ml")

        if isinstance(ml_job, MLJobCreate):
            key = self._generate_random_key()
            mlj = MLJobRead(
                id=key,
                **ml_job.model_dump(),
                created=datetime.now(),
                updated=datetime.now(),
            )
        elif isinstance(ml_job, MLJobRead):
            key = ml_job.id
            mlj = ml_job

        if client.set(key.encode("utf-8"), mlj.model_dump_json()) != 1:
            msg = "Cannot store MLJob!"
            logger.error(msg)
            raise RuntimeError(msg)

        logger.debug(f"Successfully stored MLJob {key}!")

        return mlj

    def get_all_ml_jobs(self, project_id: int) -> list[MLJobRead]:
        client = self._get_client("ml")
        all_ml_jobs: list[MLJobRead] = [
            self.load_ml_job(str(key, "utf-8")) for key in client.keys()
        ]
        return [job for job in all_ml_jobs if job.parameters.project_id == project_id]

    def load_ml_job(self, key: str) -> MLJobRead:
        client = self._get_client("ml")
        mlj = client.get(key.encode("utf-8"))
        if mlj is None:
            msg = f"MLJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)

        logger.debug(f"Successfully loaded MLJob {key}")
        return MLJobRead.model_validate_json(mlj)

    def update_ml_job(self, key: str, update: MLJobUpdate) -> MLJobRead:
        mlj = self.load_ml_job(key=key)
        data = mlj.model_dump(exclude={"updated"})
        data.update(**update.model_dump(exclude_unset=True))
        mlj = MLJobRead(**data, updated=datetime.now())
        mlj = self.store_ml_job(ml_job=mlj)
        logger.debug(f"Updated MLJob {key}")
        return mlj

    def delete_ML_job(self, key: str) -> MLJobRead:
        mlj = self.load_ml_job(key=key)
        client = self._get_client("ml")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete MLJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted MLJob {key}")
        return mlj

    def store_perspectives_job(
        self, perspectives_job: PerspectivesJobCreate | PerspectivesJobRead
    ) -> PerspectivesJobRead:
        client = self._get_client("perspectives")

        if isinstance(perspectives_job, PerspectivesJobCreate):
            key = self._generate_random_key()
            pj = PerspectivesJobRead(
                id=key,
                **perspectives_job.model_dump(),
                created=datetime.now(),
                updated=datetime.now(),
            )
        elif isinstance(perspectives_job, PerspectivesJobRead):
            key = perspectives_job.id
            pj = perspectives_job
        else:
            msg = "Invalid type for perspectives_job parameter."
            logger.error(msg)
            raise TypeError(msg)

        if client.set(key.encode("utf-8"), pj.model_dump_json()) != 1:
            msg = "Cannot store PerspectivesJob!"
            logger.error(msg)
            raise RuntimeError(msg)

        logger.debug(f"Successfully stored PerspectivesJob {key}!")
        return pj

    def get_all_perspectives_jobs(self, project_id: int) -> list[PerspectivesJobRead]:
        client = self._get_client("perspectives")
        all_perspectives_jobs: list[PerspectivesJobRead] = [
            self.load_perspectives_job(str(key, "utf-8")) for key in client.keys()
        ]
        return [job for job in all_perspectives_jobs if job.project_id == project_id]

    def load_perspectives_job(self, key: str) -> PerspectivesJobRead:
        client = self._get_client("perspectives")
        pj = client.get(key.encode("utf-8"))
        if pj is None:
            msg = f"PerspectivesJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)

        logger.debug(f"Successfully loaded PerspectivesJob {key}")
        return PerspectivesJobRead.model_validate_json(pj)

    def update_perspectives_job(
        self, key: str, update: PerspectivesJobUpdate
    ) -> PerspectivesJobRead:
        pj = self.load_perspectives_job(key=key)
        data = pj.model_dump(exclude={"updated"})
        data.update(**update.model_dump(exclude_unset=True))
        pj = PerspectivesJobRead(**data, updated=datetime.now())
        pj = self.store_perspectives_job(perspectives_job=pj)
        logger.debug(f"Updated PerspectivesJob {key}")
        return pj

    def delete_perspectives_job(self, key: str) -> PerspectivesJobRead:
        pj = self.load_perspectives_job(key=key)
        client = self._get_client("tm")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete PerspectivesJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted PerspectivesJob {key}")
        return pj
