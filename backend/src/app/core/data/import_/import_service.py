import zipfile
from pathlib import Path
from typing import (
    Callable,
    Dict,
    Optional,
)

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.import_job import (
    ImportJobCreate,
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
    ImportJobUpdate,
)
from app.core.data.import_.import_codes import import_codes_to_proj
from app.core.data.import_.import_project import import_project
from app.core.data.import_.import_tags import import_tags_to_proj
from app.core.data.repo.repo_service import (
    RepoService,
)
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.ray_model_service import RayModelService
from app.util.singleton_meta import SingletonMeta


class ImportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the Import Job! {cause}")


class ImportJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, import_job_id: str) -> None:
        super().__init__(
            f"The ImportJob with ID {import_job_id} already started or is done!"
        )


class NoSuchImportJobError(Exception):
    def __init__(self, import_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not ImportJob with ID {import_job_id}! {cause}")


class UnsupportedImportJobTypeError(Exception):
    def __init__(self, export_job_type: ImportJobType) -> None:
        super().__init__(f"ImportJobType {export_job_type} is not supported! ")


class ImportService(metaclass=SingletonMeta):
    def __new__(cls):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()

        cls.import_method_for_job_type: Dict[ImportJobType, Callable[..., None]] = {
            ImportJobType.TAGS: cls._import_tags_to_proj,
            ImportJobType.CODES: cls._import_codes_to_proj,
            ImportJobType.PROJECT: cls._import_project,
        }

        return super(ImportService, cls).__new__(cls)

    def __unzip(self, path_to_zip_file: Path, unzip_target: Path):
        with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
            zip_ref.extractall(unzip_target)

    def prepare_import_job(
        self, import_code_job_params: ImportJobParameters
    ) -> ImportJobRead:
        self._assert_all_requested_data_exists(
            import_code_job_params=import_code_job_params
        )

        imp_create = ImportJobCreate(parameters=import_code_job_params)
        try:
            imj_read = self.redis.store_import_job(import_job=imp_create)
        except Exception as e:
            raise ImportJobPreparationError(cause=e)

        return imj_read

    def get_import_job(self, import_job_id: str) -> ImportJobRead:
        try:
            exj = self.redis.load_import_job(key=import_job_id)
        except Exception as e:
            raise NoSuchImportJobError(import_job_id=import_job_id, cause=e)

        return exj

    def start_import_sync(self, import_job_id: str) -> ImportJobRead:
        imj = self.get_import_job(import_job_id=import_job_id)
        if imj.status != BackgroundJobStatus.WAITING:
            raise ImportJobAlreadyStartedOrDoneError(import_job_id=import_job_id)

        imj = self._update_import_job(
            status=BackgroundJobStatus.RUNNING, import_job_id=import_job_id
        )
        try:
            with self.sqls.db_session() as db:
                # get the export method based on the jobtype
                import_method = self.import_method_for_job_type.get(
                    imj.parameters.import_job_type, None
                )
                if import_method is None:
                    raise UnsupportedImportJobTypeError(imj.parameters.import_job_type)

                # execute the import_method with the provided specific parameters
                import_method(
                    self=self,
                    db=db,
                    imj_parameters=imj.parameters,
                )

            imj = self._update_import_job(
                status=BackgroundJobStatus.FINISHED,
                import_job_id=import_job_id,
            )

        except Exception as e:
            logger.error(f"Cannot finish import job: {e}")
            imj = self._update_import_job(
                status=BackgroundJobStatus.ERROR,
                import_job_id=import_job_id,
            )

        return imj

    def _update_import_job(
        self,
        import_job_id: str,
        status: Optional[BackgroundJobStatus] = None,
    ) -> ImportJobRead:
        update = ImportJobUpdate(status=status)
        try:
            imj = self.redis.update_import_job(key=import_job_id, update=update)
        except Exception as e:
            raise NoSuchImportJobError(import_job_id=import_job_id, cause=e)
        return imj

    def _assert_all_requested_data_exists(
        self, import_code_job_params: ImportJobParameters
    ) -> bool:
        filename = import_code_job_params.filename
        return self.repo._temp_file_exists(filename=filename)

    def _import_codes_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        path_to_file = self.repo.get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)

        import_codes_to_proj(db=db, df=df, project_id=project_id)

    def _import_tags_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        path_to_file = self.repo.get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)

        import_tags_to_proj(db=db, df=df, proj_id=project_id)

    def _import_project(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        proj_id = imj_parameters.proj_id
        user_id = imj_parameters.user_id
        filename = imj_parameters.filename

        # unzip file
        try:
            path_to_zip_file = self.repo.get_dst_path_for_temp_file(filename)
            path_to_temp_import_dir = self.repo.create_temp_dir(
                f"import_user_{user_id}_project_{proj_id}"
            )
            self.__unzip(
                path_to_zip_file=path_to_zip_file, unzip_target=path_to_temp_import_dir
            )
            logger.info("unzipped imported project")
        except Exception as e:
            raise e

        import_project(
            db=db,
            repo=self.repo,
            path_to_dir=path_to_temp_import_dir,
            proj_id=proj_id,
        )
