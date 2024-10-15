from pathlib import Path

from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.preprocessing_service import PreprocessingService

sql: SQLService = SQLService(echo=False)
redis: RedisService = RedisService()
repo: RepoService = RepoService()
prepro: PreprocessingService = PreprocessingService()


def import_uploaded_archive_(archive_file_path: Path, project_id: int) -> None:
    prepro.prepare_and_start_preprocessing_job_async(
        proj_id=project_id, archive_file_path=archive_file_path
    )


def execute_text_preprocessing_pipeline_(
    cargo: PipelineCargo, is_init: bool = True
) -> None:
    pipeline = prepro.get_text_pipeline(is_init)
    logger.debug(
        f"Executing text Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(cargo=cargo)


def execute_image_preprocessing_pipeline_(
    cargo: PipelineCargo, is_init: bool = True
) -> None:
    pipeline = prepro.get_image_pipeline(is_init=is_init)
    logger.debug(
        f"Executing image Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(cargo=cargo)


def execute_audio_preprocessing_pipeline_(cargo: PipelineCargo) -> None:
    pipeline = prepro.get_audio_pipeline()
    logger.debug(
        f"Executing audio Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(cargo=cargo)


def execute_video_preprocessing_pipeline_(cargo: PipelineCargo) -> None:
    pipeline = prepro.get_video_pipeline()
    logger.debug(
        f"Executing audio Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(cargo=cargo)
