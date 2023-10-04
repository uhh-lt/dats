from pathlib import Path
from typing import List

from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.preprocessing_service import PreprocessingService
from loguru import logger

sql: SQLService = SQLService(echo=False)
redis: RedisService = RedisService()
repo: RepoService = RepoService()
prepro: PreprocessingService = PreprocessingService()


def import_uploaded_archive_(archive_file_path: Path, project_id: int) -> None:
    prepro.prepare_and_start_preprocessing_job_async(
        proj_id=project_id, archive_file_path=archive_file_path
    )


def execute_text_preprocessing_pipeline_(cargos: List[PipelineCargo]) -> None:
    pipeline = prepro.get_text_pipeline()
    logger.info(
        f"Executing Preprocessing Pipeline\n\t{pipeline}\n\t with {len(cargos)} cargos!"
    )
    pipeline.execute(cargos=cargos)


def execute_image_preprocessing_pipeline_(cargos: List[PipelineCargo]) -> None:
    pipeline = prepro.get_image_pipeline()
    logger.info(
        f"Executing Preprocessing Pipeline\n\t{pipeline}\n\t with {len(cargos)} cargos!"
    )
    pipeline.execute(cargos=cargos)


def execute_audio_preprocessing_pipeline_(cargos: List[PipelineCargo]) -> None:
    pipeline = prepro.get_audio_pipeline()
    logger.info(
        f"Executing Preprocessing Pipeline\n\t{pipeline}\n\t with {len(cargos)} cargos!"
    )
    pipeline.execute(cargos=cargos)


def execute_video_preprocessing_pipeline_(cargos: List[PipelineCargo]) -> None:
    pipeline = prepro.get_video_pipeline()
    logger.info(
        f"Executing Preprocessing Pipeline\n\t{pipeline}\n\t with {len(cargos)} cargos!"
    )
    pipeline.execute(cargos=cargos)
