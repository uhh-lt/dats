from loguru import logger

from app.trainer.trainer_service import TrainerService

ts: TrainerService = TrainerService()


def start_trainer_job_(trainer_job_id: str) -> None:
    ts_result = ts._start_trainer_job_sync(trainer_job_id=trainer_job_id)

    logger.info(f"TrainerJob {trainer_job_id} has finished! Result: {ts_result}")
