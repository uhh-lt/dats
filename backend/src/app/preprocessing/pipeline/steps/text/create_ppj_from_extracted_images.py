from pathlib import Path
from typing import List

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.preprocessing_service import PreprocessingService
from loguru import logger

repo = RepoService()
pps = PreprocessingService()


def create_ppj_from_extracted_images(cargo: PipelineCargo) -> PipelineCargo:
    extracted_images: List[Path] = cargo.data["extracted_images"]
    project_id = cargo.ppj_payload.project_id

    ppj = pps.prepare_and_start_preprocessing_job_async(
        proj_id=project_id,
        unimported_project_files=extracted_images,
    )

    if ppj is not None:
        logger.info(f"Created PreprocessingJob {ppj.id} from extracted images")

    return cargo
