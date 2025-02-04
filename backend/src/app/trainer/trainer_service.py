from loguru import logger
from sqlalchemy.orm import Session

from app.celery.background_jobs import start_trainer_job_async
from app.core.data.crud.project import crud_project
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.trainer_job import (
    TrainerJobCreate,
    TrainerJobParameters,
    TrainerJobRead,
)
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.util.singleton_meta import SingletonMeta


class TrainerService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        cls.repo: RepoService = RepoService()

        return super(TrainerService, cls).__new__(cls)

    def create_and_start_trainer_job_async(
        self, *, db: Session, trainer_params: TrainerJobParameters
    ) -> TrainerJobRead:
        # make sure the project exists!
        crud_project.read(db=db, id=trainer_params.project_id)

        create_dto = TrainerJobCreate(parameters=trainer_params)
        trainer_job_read = self.redis.store_trainer_job(create_dto)
        logger.info(f"Created and prepared trainer job: {trainer_job_read}")

        start_trainer_job_async(trainer_job_id=trainer_job_read.id)

        return trainer_job_read

    def use_trainer_model(self, *, db: Session, trainer_job_id: str):
        # make sure the trainer job exists!
        trainer_job = self.redis.load_trainer_job(trainer_job_id)
        # make sure the project exists!
        crud_project.read(db=db, id=trainer_job.parameters.project_id)

        # return use_trainer_model_async(trainer_job_id=trainer_job_id).get()

    def _start_trainer_job_sync(self, trainer_job_id: str) -> TrainerJobRead:
        trainer_job = self.redis.load_trainer_job(trainer_job_id)
        logger.info(
            f"Starting trainer job: {trainer_job} "
            f"with parameters: {trainer_job.parameters}"
        )
        trainer_job.status = BackgroundJobStatus.RUNNING
        trainer_job = self.redis.store_trainer_job(trainer_job)

        try:
            # TODO: decide from the trainer job what model to train...
            # trainer_job = self.__finetune_sbert_model(trainer_job)
            trainer_job.status = BackgroundJobStatus.FINISHED
            trainer_job = self.redis.store_trainer_job(trainer_job)
        except Exception as e:
            logger.error(f"Error while executing trainer job: {e}")
            trainer_job.status = BackgroundJobStatus.ERROR
            trainer_job = self.redis.store_trainer_job(trainer_job)
            raise e

        return trainer_job
