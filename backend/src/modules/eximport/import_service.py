import zipfile
from pathlib import Path
from typing import Callable

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from modules.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from modules.eximport.codes.import_codes import import_codes_to_proj
from modules.eximport.cota.import_cota import import_cota_to_proj
from modules.eximport.import_exceptions import (
    ImportJobPreparationError,
    UnsupportedImportJobTypeError,
)
from modules.eximport.import_job_dto import (
    ImportJobInput,
    ImportJobType,
)
from modules.eximport.memos.import_memos import import_memos_to_proj
from modules.eximport.project.import_project import import_project
from modules.eximport.project_metadata.import_project_metadata import (
    import_project_metadata_to_proj,
)
from modules.eximport.sdocs.import_sdocs import import_sdocs_to_proj
from modules.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from modules.eximport.tags.import_tags import import_tags_to_proj
from modules.eximport.timeline_analysis.import_timeline_analysis import (
    import_timeline_analysis_to_proj,
)
from modules.eximport.user.import_users import import_users_to_proj
from modules.eximport.whiteboards.import_whiteboards import import_whiteboards_to_proj
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo


class ImportService(metaclass=SingletonMeta):
    def __new__(cls):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.sqlr: SQLRepo = SQLRepo()
        cls.import_method_for_job_type: dict[ImportJobType, Callable[..., None]] = {
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
            ImportJobType.MEMOS: cls._import_memos_to_proj,
            ImportJobType.DOCUMENTS: cls._import_source_documents_to_proj,
        }
        return super(ImportService, cls).__new__(cls)

    def __unzip(self, path_to_zip_file: Path, unzip_target: Path):
        with zipfile.ZipFile(path_to_zip_file, "r") as zip_ref:
            zip_ref.extractall(unzip_target)

    def handle_import_job(self, payload: ImportJobInput) -> None:
        with self.sqlr.db_session() as db:
            # Check project exists
            crud_project.exists(
                db=db,
                id=payload.project_id,
                raise_error=True,
            )

            # Check if the file exists
            if not self.fsr._temp_file_exists(filename=payload.file_name):
                raise ImportJobPreparationError(
                    cause=Exception(f"The file {payload.file_name} does not exist!")
                )

            # get the import method based on the jobtype
            import_method = self.import_method_for_job_type.get(
                payload.import_job_type, None
            )
            if import_method is None:
                raise UnsupportedImportJobTypeError(payload.import_job_type)

            # execute the import_method with the provided specific parameters
            import_method(
                self=self,
                db=db,
                payload=payload,
            )

    def _import_codes_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import codes to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_codes_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_tags_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import tags to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_tags_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_bbox_annotations_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import bbox annotations to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_bbox_annotations_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_span_annotations_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import span annotations to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_span_annotations_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_sent_annotations_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import sent annotations to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_span_annotations_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_whiteboards_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import whiteboards to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_whiteboards_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_timeline_analyses_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import timeline analyses to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_timeline_analysis_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_cota_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import cota to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_cota_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_memos_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import memos to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_memos_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_users_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import users annotations to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_users_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_project_metadata_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import project metadata to a project"""
        path_to_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
        df = pd.read_csv(path_to_file)
        import_project_metadata_to_proj(db=db, df=df, project_id=payload.project_id)

    def _import_source_documents_to_proj(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import source documents to a project"""
        # unzip file
        try:
            path_to_zip_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
            path_to_temp_import_dir = self.fsr.create_temp_dir(
                f"import_user_{payload.user_id}_sdocs_{payload.project_id}"
            )
            self.__unzip(
                path_to_zip_file=path_to_zip_file, unzip_target=path_to_temp_import_dir
            )
            logger.info("unzipped imported sdocds")
        except Exception as e:
            raise e

        import_sdocs_to_proj(
            db=db,
            path_to_dir=path_to_temp_import_dir,
            project_id=payload.project_id,
        )

    def _import_project(
        self,
        db: Session,
        payload: ImportJobInput,
    ) -> None:
        """Import an entire project"""
        # unzip file
        try:
            path_to_zip_file = self.fsr.get_dst_path_for_temp_file(payload.file_name)
            path_to_temp_import_dir = self.fsr.create_temp_dir(
                f"import_user_{payload.user_id}_project_{payload.project_id}"
            )
            self.__unzip(
                path_to_zip_file=path_to_zip_file, unzip_target=path_to_temp_import_dir
            )
            logger.info("unzipped imported project")
        except Exception as e:
            raise e

        import_project(
            db=db,
            fsr=self.fsr,
            path_to_dir=path_to_temp_import_dir,
            proj_id=payload.project_id,
        )
