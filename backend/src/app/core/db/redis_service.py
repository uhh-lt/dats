import uuid
from datetime import datetime
from typing import List, Optional, Union

import redis
from app.core.data.dto.crawler_job import (
    CrawlerJobCreate,
    CrawlerJobRead,
    CrawlerJobUpdate,
)
from app.core.data.dto.export_job import ExportJobCreate, ExportJobRead, ExportJobUpdate
from app.core.data.dto.feedback import FeedbackCreate, FeedbackRead
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobCreate,
    PreprocessingJobRead,
    PreprocessingJobUpdate,
)
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger


class RedisService(metaclass=SingletonMeta):
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
                assert clients[
                    client
                ].ping(), f"Couldn't connect to Redis {str(client)} DB #{db_idx} at {r_host}:{r_port}!"
                logger.info(
                    f"Successfully connected to Redis {str(client)} DB #{db_idx}"
                )
            cls.__clients = clients
        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        return super(RedisService, cls).__new__(cls)

    def shutdown(self) -> None:
        logger.info("Shutting down Redis Service!")
        for client in self.__clients.values():
            client.close()

    @staticmethod
    def _generate_random_key() -> str:
        return str(uuid.uuid4())

    def _get_client(self, typ: str):
        if not typ.lower() in self.__clients:
            raise KeyError(f"Redis Client '{typ.lower()}' does not exist!")
        return self.__clients[typ.lower()]

    def _flush_client(self, typ: str):
        client = self._get_client(typ)
        logger.warning(f"Flushing Redis Client DB '{typ}'!")
        client.flushdb()
        client.save()

    def store_export_job(
        self, export_job: Union[ExportJobCreate, ExportJobRead]
    ) -> Optional[ExportJobRead]:
        client = self._get_client("export")

        if isinstance(export_job, ExportJobCreate):
            key = self._generate_random_key()
            exj = ExportJobRead(id=key, created=datetime.now(), **export_job.dict())
        elif isinstance(export_job, ExportJobRead):
            key = export_job.id
            exj = export_job

        if client.set(key.encode("utf-8"), exj.json()) != 1:
            logger.error("Cannot store ExportJob!")
            return None

        logger.debug(f"Successfully stored ExportJob {key}!")

        return exj

    def load_export_job(self, key: str) -> Optional[ExportJobRead]:
        client = self._get_client("export")
        exj = client.get(key.encode("utf-8"))
        if exj is None:
            logger.error(f"ExportJob with ID {key} does not exist!")
            return None
        else:
            logger.debug(f"Successfully loaded ExportJob {key}")
            return ExportJobRead.parse_raw(exj)

    def update_export_job(
        self, key: str, update: ExportJobUpdate
    ) -> Optional[ExportJobRead]:
        exj = self.load_export_job(key=key)
        if exj is None:
            logger.error(f"Cannot update ExportJob {key}")
            return None
        data = exj.dict()
        data.update(**update.dict())
        exj = ExportJobRead(**data)
        exj = self.store_export_job(export_job=exj)
        if exj is not None:
            logger.debug(f"Updated ExportJob {key}")
            return exj
        else:
            logger.error(f"Cannot update ExportJob {key}")

    def delete_export_job(self, key: str) -> Optional[ExportJobRead]:
        exj = self.load_export_job(key=key)
        client = self._get_client("export")
        if exj is None or client.delete(key.encode("utf-8")) != 1:
            logger.error(f"Cannot delete ExportJob {key}")
            return None
        logger.debug(f"Deleted ExportJob {key}")
        return exj

    def store_crawler_job(
        self, crawler_job: Union[CrawlerJobCreate, CrawlerJobRead]
    ) -> Optional[CrawlerJobRead]:
        client = self._get_client("crawler")

        if isinstance(crawler_job, CrawlerJobCreate):
            key = self._generate_random_key()
            cj = CrawlerJobRead(id=key, created=datetime.now(), **crawler_job.dict())
        elif isinstance(crawler_job, CrawlerJobRead):
            key = crawler_job.id
            cj = crawler_job

        if client.set(key.encode("utf-8"), cj.json()) != 1:
            logger.error("Cannot store CrawlerJob!")
            return None

        logger.debug(f"Successfully stored CrawlerJob {key}!")

        return cj

    def load_crawler_job(self, key: str) -> Optional[CrawlerJobRead]:
        client = self._get_client("crawler")

        cj = client.get(key.encode("utf-8"))
        if cj is None:
            logger.error(f"CrawlerJob with ID {key} does not exist!")
            return None
        else:
            logger.debug(f"Successfully loaded CrawlerJob {key}")
            return CrawlerJobRead.parse_raw(cj)

    def update_crawler_job(
        self, key: str, update: CrawlerJobUpdate
    ) -> Optional[CrawlerJobRead]:
        cj = self.load_crawler_job(key=key)
        if cj is None:
            logger.error(f"Cannot update CrawlerJob {key}")
            return None
        data = cj.dict()
        data.update(**update.dict())
        cj = CrawlerJobRead(**data)
        cj = self.store_crawler_job(crawler_job=cj)
        if cj is not None:
            logger.debug(f"Updated CrawlerJob {key}")
            return cj
        else:
            logger.error(f"Cannot update CrawlerJob {key}")

    def delete_crawler_job(self, key: str) -> Optional[CrawlerJobRead]:
        cj = self.load_crawler_job(key=key)
        client = self._get_client("crawler")
        if cj is None or client.delete(key.encode("utf-8")) != 1:
            logger.error(f"Cannot delete CrawlerJob {key}")
            return None
        logger.debug(f"Deleted CrawlerJob {key}")
        return cj

    def get_all_crawler_jobs(
        self, project_id: Optional[int] = None
    ) -> List[CrawlerJobRead]:
        client = self._get_client("crawler")
        all_crawler_jobs: List[CrawlerJobRead] = [
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

    def store_preprocessing_job(
        self,
        preprocessing_job: Union[PreprocessingJobCreate, PreprocessingJobRead],
    ) -> Optional[PreprocessingJobRead]:
        client = self._get_client("preprocessing")

        if isinstance(preprocessing_job, PreprocessingJobCreate):
            key = self._generate_random_key()
            ppj = PreprocessingJobRead(
                id=key,
                created=datetime.now(),
                updated=datetime.now(),
                **preprocessing_job.dict(),
            )
        elif isinstance(preprocessing_job, PreprocessingJobRead):
            key = preprocessing_job.id
            ppj = preprocessing_job

        if client.set(key.encode("utf-8"), ppj.json()) != 1:
            logger.error("Cannot store PreprocessingJob!")
            return None

        logger.debug(f"Successfully stored PreprocessingJob {key}!")

        return ppj

    def load_preprocessing_job(self, key: str) -> Optional[PreprocessingJobRead]:
        client = self._get_client("preprocessing")

        ppj = client.get(key.encode("utf-8"))
        if ppj is None:
            logger.error(f"PreprocessingJob with ID {key} does not exist!")
            return None
        else:
            logger.debug(f"Successfully loaded PreprocessingJob {key}")
            return PreprocessingJobRead.parse_raw(ppj)

    def update_preprocessing_job(
        self, key: str, update: PreprocessingJobUpdate
    ) -> Optional[PreprocessingJobRead]:
        ppj = self.load_preprocessing_job(key=key)
        if ppj is None:
            logger.error(f"Cannot update PreprocessingJob {key}")
            return None
        ppj.updated = datetime.now()
        data = ppj.dict()
        data.update(**update.dict(exclude_none=True))
        ppj = PreprocessingJobRead(**data)
        ppj = self.store_preprocessing_job(preprocessing_job=ppj)
        if ppj is not None:
            logger.debug(f"Updated PreprocessingJob {key}")
            return ppj
        else:
            logger.error(f"Cannot update PreprocessingJob {key}")

    def delete_preprocessing_job(self, key: str) -> Optional[PreprocessingJobRead]:
        ppj = self.load_preprocessing_job(key=key)
        client = self._get_client("preprocessing")
        if ppj is None or client.delete(key.encode("utf-8")) != 1:
            logger.error(f"Cannot delete PreprocessingJob {key}")
            return None
        logger.debug(f"Deleted PreprocessingJob {key}")
        return ppj

    def get_all_preprocessing_jobs(
        self, project_id: Optional[int] = None
    ) -> List[PreprocessingJobRead]:
        client = self._get_client("preprocessing")
        all_preprocessing_jobs: List[PreprocessingJobRead] = [
            self.load_preprocessing_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_preprocessing_jobs
        else:
            return [
                job
                for job in all_preprocessing_jobs
                if job.project_id == project_id
            ]

    def store_feedback(self, feedback: FeedbackCreate) -> Optional[FeedbackRead]:
        client = self._get_client("feedback")
        key = self._generate_random_key()
        fb = FeedbackRead(
            id=key,
            user_content=feedback.user_content,
            user_id=feedback.user_id,
            created=datetime.now(),
        )
        if client.set(key.encode("utf-8"), fb.json()) != 1:
            logger.error("Cannot store Feedback!")
            return None

        logger.debug("Successfully stored Feedback!")

        return fb

    def load_feedback(self, key: str) -> Optional[FeedbackRead]:
        client = self._get_client("feedback")
        fb = client.get(key.encode("utf-8"))
        if fb is None:
            logger.error(f"Feedback with ID {key} does not exist!")
            return None
        else:
            logger.debug(f"Successfully loaded Feedback {key}")
            return FeedbackRead.parse_raw(fb)

    @logger.catch(reraise=True)
    def get_all_feedbacks(self) -> List[FeedbackRead]:
        client = self._get_client("feedback")
        return [self.load_feedback(str(key, "utf-8")) for key in client.keys()]

    @logger.catch(reraise=True)
    def get_all_feedbacks_of_user(self, user_id: int) -> List[FeedbackRead]:
        fbs = self.get_all_feedbacks()
        return [fb for fb in fbs if fb.user_id == user_id]
