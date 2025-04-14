import zipfile
from pathlib import Path
from typing import (
    Callable,
    Dict,
    List,
)

import pandas as pd
from app.core.data.crud.project import crud_project
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.import_job import (
    ImportJobCreate,
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
    ImportJobUpdate,
)
from app.core.data.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from app.core.data.eximport.codes.import_codes import import_codes_to_proj
from app.core.data.eximport.cota.import_cota import import_cota_to_proj
from app.core.data.eximport.project.import_project import import_project
from app.core.data.eximport.project_metadata.import_project_metadata import (
    import_project_metadata_to_proj,
)
from app.core.data.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from app.core.data.eximport.tags.import_tags import import_tags_to_proj
from app.core.data.eximport.timeline_analysis.import_timeline_analysis import (
    import_timeline_analysis_to_proj,
)
from app.core.data.eximport.user.import_users import import_users_to_proj
from app.core.data.eximport.whiteboards.import_whiteboards import (
    import_whiteboards_to_proj,
)
from app.core.data.repo.repo_service import (
    RepoService,
)
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.ray_model_service import RayModelService
from app.util.singleton_meta import SingletonMeta
from loguru import logger
from sqlalchemy.orm import Session


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
    def __init__(self, import_job_type: ImportJobType) -> None:
        super().__init__(f"ImportJobType {import_job_type} is not supported! ")


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
            ImportJobType.BBOX_ANNOTATIONS: cls._import_bbox_annotations_to_proj,
            ImportJobType.SPAN_ANNOTATIONS: cls._import_span_annotations_to_proj,
            ImportJobType.SENTENCE_ANNOTATIONS: cls._import_sent_annotations_to_proj,
            ImportJobType.PROJECT_METADATA: cls._import_project_metadata_to_proj,
            ImportJobType.USERS: cls._import_users_to_proj,
            ImportJobType.WHITEBOARDS: cls._import_whiteboards_to_proj,
            ImportJobType.TIMELINE_ANALYSES: cls._import_timeline_analyses_to_proj,
            ImportJobType.COTA: cls._import_cota_to_proj,
        }
        return super(ImportService, cls).__new__(cls)

    def __unzip(self, path_to_zip_file: Path, unzip_target: Path):
        with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
            zip_ref.extractall(unzip_target)

    def prepare_import_job(
        self, import_job_params: ImportJobParameters
    ) -> ImportJobRead:
        with self.sqls.db_session() as db:
            crud_project.exists(
                db=db,
                id=import_job_params.project_id,
                raise_error=True,
            )

        # Check if the file exists
        if not self.repo._temp_file_exists(filename=import_job_params.file_name):
            raise ImportJobPreparationError(
                cause=Exception(
                    f"The file {import_job_params.file_name} does not exist!"
                )
            )

        imp_create = ImportJobCreate(parameters=import_job_params)
        try:
            imj_read = self.redis.store_import_job(import_job=imp_create)
        except Exception as e:
            raise ImportJobPreparationError(cause=e)
        return imj_read

    def get_import_job(self, import_job_id: str) -> ImportJobRead:
        try:
            imj = self.redis.load_import_job(key=import_job_id)
        except Exception as e:
            raise NoSuchImportJobError(import_job_id=import_job_id, cause=e)
        return imj

    def get_all_import_jobs(self, project_id: int) -> List[ImportJobRead]:
        return self.redis.get_all_import_jobs(project_id=project_id)

    def _update_import_job(
        self,
        import_job_id: str,
        update: ImportJobUpdate,
    ) -> ImportJobRead:
        try:
            imj = self.redis.update_import_job(key=import_job_id, update=update)
        except Exception as e:
            raise NoSuchImportJobError(import_job_id=import_job_id, cause=e)
        return imj

    def start_import_sync(self, import_job_id: str) -> ImportJobRead:
        imj = self.get_import_job(import_job_id=import_job_id)
        if imj.status != BackgroundJobStatus.WAITING:
            raise ImportJobAlreadyStartedOrDoneError(import_job_id=import_job_id)
        imj = self._update_import_job(
            import_job_id=import_job_id,
            update=ImportJobUpdate(status=BackgroundJobStatus.RUNNING),
        )
        try:
            with self.sqls.db_session() as db:
                # get the import method based on the jobtype
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
                import_job_id=import_job_id,
                update=ImportJobUpdate(status=BackgroundJobStatus.FINISHED),
            )
        except Exception as e:
            logger.error(f"Cannot finish import job: {e}")
            imj = self._update_import_job(
                import_job_id=import_job_id,
                update=ImportJobUpdate(
                    status=BackgroundJobStatus.ERROR,
                    error=f"Cannot finish import job: {e}",
                ),
            )
        return imj

    def _import_codes_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import codes to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_codes_to_proj(db=db, df=df, project_id=imj_parameters.project_id)

    def _import_tags_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import tags to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_tags_to_proj(db=db, df=df, project_id=imj_parameters.project_id)

    def _import_bbox_annotations_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import bbox annotations to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_bbox_annotations_to_proj(
            db=db, df=df, project_id=imj_parameters.project_id
        )

    def _import_span_annotations_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import span annotations to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_span_annotations_to_proj(
            db=db, df=df, project_id=imj_parameters.project_id
        )

    def _import_sent_annotations_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import sent annotations to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_span_annotations_to_proj(
            db=db, df=df, project_id=imj_parameters.project_id
        )

    def _import_whiteboards_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import whiteboards to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_whiteboards_to_proj(db=db, df=df, project_id=imj_parameters.project_id)

    def _import_timeline_analyses_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import timeline analyses to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_timeline_analysis_to_proj(
            db=db, df=df, project_id=imj_parameters.project_id
        )

    def _import_cota_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import cota to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_cota_to_proj(db=db, df=df, project_id=imj_parameters.project_id)

    def _import_users_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import users annotations to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_users_to_proj(db=db, df=df, project_id=imj_parameters.project_id)

    def _import_project_metadata_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import project metadata to a project"""
        path_to_file = self.repo.get_dst_path_for_temp_file(imj_parameters.file_name)
        df = pd.read_csv(path_to_file)
        import_project_metadata_to_proj(
            db=db, df=df, project_id=imj_parameters.project_id
        )

    def _import_project(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        """Import an entire project"""
        # unzip file
        try:
            path_to_zip_file = self.repo.get_dst_path_for_temp_file(
                imj_parameters.file_name
            )
            path_to_temp_import_dir = self.repo.create_temp_dir(
                f"import_user_{imj_parameters.user_id}_project_{imj_parameters.project_id}"
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
            proj_id=imj_parameters.project_id,
        )
