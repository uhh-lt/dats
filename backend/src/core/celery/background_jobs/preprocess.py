from pathlib import Path

from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.preprocessing_service import PreprocessingService
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo

sql: SQLRepo = SQLRepo(echo=False)
fsr: FilesystemRepo = FilesystemRepo()
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


def execute_audio_preprocessing_pipeline_(
    cargo: PipelineCargo,
    is_init: bool = True,
) -> None:
    pipeline = prepro.get_audio_pipeline(is_init=is_init)
    logger.debug(
        f"Executing audio Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(
        cargo=cargo,
    )


def execute_video_preprocessing_pipeline_(
    cargo: PipelineCargo,
    is_init: bool = True,
) -> None:
    pipeline = prepro.get_video_pipeline(is_init=is_init)
    logger.debug(
        f"Executing audio Preprocessing Pipeline\n\t{pipeline}\n\t for cargo"
        f" {cargo.ppj_payload.filename}!"
    )
    pipeline.execute(cargo=cargo)
