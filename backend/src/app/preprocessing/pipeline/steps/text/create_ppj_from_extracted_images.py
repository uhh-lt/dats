from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.preprocessing.preprocessing_service import PreprocessingService

repo = RepoService()
pps = PreprocessingService()


def create_ppj_from_extracted_images(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    project_id = cargo.ppj_payload.project_id

    if len(pptd.extracted_images) != 0:
        ppj = pps.prepare_and_start_preprocessing_job_async(
            proj_id=project_id,
            unimported_project_files=pptd.extracted_images,
        )

        if ppj is not None:
            logger.info(f"Created PreprocessingJob {ppj.id} from extracted images")

    return cargo
