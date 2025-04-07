from pathlib import Path
from typing import Callable, Dict, Optional

from loguru import logger

from app.core.data.crud.project import crud_project
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.export_job import (
    ExportJobCreate,
    ExportJobParameters,
    ExportJobRead,
    ExportJobType,
    ExportJobUpdate,
)
from app.core.data.eximport.bbox_annotations.export_bbox_annotations import (
    export_all_bbox_annotations,
    export_selected_bbox_annotations,
)
from app.core.data.eximport.codes.export_codes import export_all_codes
from app.core.data.eximport.memos.export_memos import (
    export_all_memos,
    export_selected_memos,
)
from app.core.data.eximport.project.export_project import (
    export_project,
)
from app.core.data.eximport.project_metadata.export_project_metadata import (
    export_all_project_metadatas,
)
from app.core.data.eximport.sdocs.export_sdocs import (
    export_all_sdocs,
    export_selected_sdocs,
)
from app.core.data.eximport.sent_annotations.export_sentence_annotations import (
    export_all_sentence_annotations,
    export_selected_sentence_annotations,
)
from app.core.data.eximport.span_annotations.export_span_annotations import (
    export_all_span_annotations,
    export_selected_span_annotations,
)
from app.core.data.eximport.tags.export_tags import (
    export_all_tags,
)
from app.core.data.eximport.user.export_users import (
    export_all_users,
)
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class ExportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the ExportJob! {cause}")


class ExportJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, export_job_id: str) -> None:
        super().__init__(
            f"The ExportJob with ID {export_job_id} already started or is done!"
        )


class NoSuchExportJobError(Exception):
    def __init__(self, export_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not ExportJob with ID {export_job_id}! {cause}")


class UnsupportedExportJobTypeError(Exception):
    def __init__(self, export_job_type: ExportJobType) -> None:
        super().__init__(f"ExportJobType {export_job_type} is not supported! ")


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()

        # map from job_type to function
        cls.export_method_for_job_type: Dict[ExportJobType, Callable[..., Path]] = {
            ExportJobType.ALL_DATA: export_project,
            # all
            ExportJobType.ALL_USERS: export_all_users,
            ExportJobType.ALL_SDOCS: export_all_sdocs,
            ExportJobType.ALL_CODES: export_all_codes,
            ExportJobType.ALL_TAGS: export_all_tags,
            ExportJobType.ALL_SPAN_ANNOTATIONS: export_all_span_annotations,
            ExportJobType.ALL_SENTENCE_ANNOTATIONS: export_all_sentence_annotations,
            ExportJobType.ALL_BBOX_ANNOTATIONS: export_all_bbox_annotations,
            ExportJobType.ALL_MEMOS: export_all_memos,
            ExportJobType.ALL_PROJECT_METADATA: export_all_project_metadatas,
            # selected
            ExportJobType.SELECTED_SDOCS: export_selected_sdocs,
            ExportJobType.SELECTED_SPAN_ANNOTATIONS: export_selected_span_annotations,
            ExportJobType.SELECTED_SENTENCE_ANNOTATIONS: export_selected_sentence_annotations,
            ExportJobType.SELECTED_BBOX_ANNOTATIONS: export_selected_bbox_annotations,
            ExportJobType.SELECTED_MEMOS: export_selected_memos,
        }

        return super(ExportService, cls).__new__(cls)

    def prepare_export_job(self, export_params: ExportJobParameters) -> ExportJobRead:
        with self.sqls.db_session() as db:
            crud_project.exists(
                db=db,
                id=export_params.project_id,
                raise_error=True,
            )

        exj_create = ExportJobCreate(parameters=export_params)
        try:
            exj_read = self.redis.store_export_job(export_job=exj_create)
        except Exception as e:
            raise ExportJobPreparationError(cause=e)

        return exj_read

    def get_export_job(self, export_job_id: str) -> ExportJobRead:
        try:
            exj = self.redis.load_export_job(key=export_job_id)
        except Exception as e:
            raise NoSuchExportJobError(export_job_id=export_job_id, cause=e)
        return exj

    def _update_export_job(
        self,
        export_job_id: str,
        status: Optional[BackgroundJobStatus] = None,
        url: Optional[str] = None,
    ) -> ExportJobRead:
        update = ExportJobUpdate(status=status, results_url=url)
        try:
            exj = self.redis.update_export_job(key=export_job_id, update=update)
        except Exception as e:
            raise NoSuchExportJobError(export_job_id=export_job_id, cause=e)
        return exj

    def start_export_job_sync(self, export_job_id: str) -> ExportJobRead:
        exj = self.get_export_job(export_job_id=export_job_id)
        if exj.status != BackgroundJobStatus.WAITING:
            raise ExportJobAlreadyStartedOrDoneError(export_job_id=export_job_id)

        exj = self._update_export_job(
            status=BackgroundJobStatus.RUNNING, export_job_id=export_job_id
        )

        try:
            with self.sqls.db_session() as db:
                # get the export method based on the jobtype
                export_method = self.export_method_for_job_type.get(
                    exj.parameters.export_job_type, None
                )
                if export_method is None:
                    raise UnsupportedExportJobTypeError(exj.parameters.export_job_type)

                # execute the export_method with the provided specific parameters
                results_path = export_method(
                    db=db,
                    repo=self.repo,
                    project_id=exj.parameters.project_id,
                    **(
                        exj.parameters.specific_export_job_parameters.model_dump(
                            exclude={"export_job_type"}
                        )
                        if exj.parameters.specific_export_job_parameters
                        else {}
                    ),
                )
                results_url = self.repo.get_temp_file_url(
                    results_path.name, relative=True
                )

            exj = self._update_export_job(
                url=results_url,
                status=BackgroundJobStatus.FINISHED,
                export_job_id=export_job_id,
            )

        except Exception as e:
            logger.error(f"Cannot finish export job: {e}")
            self._update_export_job(  # There the exj has to be taken and passed back?
                status=BackgroundJobStatus.ERROR,
                url=None,
                export_job_id=export_job_id,
            )

        return exj
