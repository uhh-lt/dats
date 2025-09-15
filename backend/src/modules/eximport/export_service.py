from pathlib import Path
from typing import Callable

from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from modules.eximport.bbox_annotations.export_bbox_annotations import (
    export_all_bbox_annotations,
    export_selected_bbox_annotations,
)
from modules.eximport.codes.export_codes import export_all_codes
from modules.eximport.cota.export_cota import export_all_cota, export_selected_cota
from modules.eximport.export_exceptions import UnsupportedExportJobTypeError
from modules.eximport.export_job_dto import (
    ExportJobInput,
    ExportJobOutput,
    ExportJobType,
)
from modules.eximport.folder.export_folders import export_all_folders
from modules.eximport.memos.export_memos import export_all_memos, export_selected_memos
from modules.eximport.project.export_project import export_project
from modules.eximport.project_metadata.export_project_metadata import (
    export_all_project_metadatas,
)
from modules.eximport.sdocs.export_sdocs import export_all_sdocs, export_selected_sdocs
from modules.eximport.sent_annotations.export_sentence_annotations import (
    export_all_sentence_annotations,
    export_selected_sentence_annotations,
)
from modules.eximport.span_annotations.export_span_annotations import (
    export_all_span_annotations,
    export_selected_span_annotations,
)
from modules.eximport.tags.export_tags import export_all_tags
from modules.eximport.timeline_analysis.export_timeline_analysis import (
    export_all_timeline_analyses,
    export_selected_timeline_analyses,
)
from modules.eximport.user.export_users import export_all_users
from modules.eximport.whiteboards.export_whiteboards import (
    export_all_whiteboards,
    export_selected_whiteboards,
)
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.sqlr: SQLRepo = SQLRepo()

        # map from job_type to function
        cls.export_method_for_job_type: dict[ExportJobType, Callable[..., Path]] = {
            ExportJobType.ALL_DATA: export_project,
            # all
            ExportJobType.ALL_USERS: export_all_users,
            ExportJobType.ALL_SDOCS: export_all_sdocs,
            ExportJobType.ALL_CODES: export_all_codes,
            ExportJobType.ALL_TAGS: export_all_tags,
            ExportJobType.ALL_FOLDERS: export_all_folders,
            ExportJobType.ALL_SPAN_ANNOTATIONS: export_all_span_annotations,
            ExportJobType.ALL_SENTENCE_ANNOTATIONS: export_all_sentence_annotations,
            ExportJobType.ALL_BBOX_ANNOTATIONS: export_all_bbox_annotations,
            ExportJobType.ALL_MEMOS: export_all_memos,
            ExportJobType.ALL_PROJECT_METADATA: export_all_project_metadatas,
            ExportJobType.ALL_WHITEBOARDS: export_all_whiteboards,
            ExportJobType.ALL_TIMELINE_ANALYSES: export_all_timeline_analyses,
            ExportJobType.ALL_COTA: export_all_cota,
            # selected
            ExportJobType.SELECTED_SDOCS: export_selected_sdocs,
            ExportJobType.SELECTED_SPAN_ANNOTATIONS: export_selected_span_annotations,
            ExportJobType.SELECTED_SENTENCE_ANNOTATIONS: export_selected_sentence_annotations,
            ExportJobType.SELECTED_BBOX_ANNOTATIONS: export_selected_bbox_annotations,
            ExportJobType.SELECTED_MEMOS: export_selected_memos,
            ExportJobType.SELECTED_WHITEBOARDS: export_selected_whiteboards,
            ExportJobType.SELECTED_TIMELINE_ANALYSES: export_selected_timeline_analyses,
            ExportJobType.SELECTED_COTA: export_selected_cota,
        }

        return super(ExportService, cls).__new__(cls)

    def handle_export_job(self, payload: ExportJobInput) -> ExportJobOutput:
        with self.sqlr.db_session() as db:
            # Check project exists
            crud_project.exists(
                db=db,
                id=payload.project_id,
                raise_error=True,
            )

            # get the export method based on the jobtype
            export_method = self.export_method_for_job_type.get(
                payload.export_job_type, None
            )
            if export_method is None:
                raise UnsupportedExportJobTypeError(payload.export_job_type)

            # execute the export_method with the provided specific parameters
            results_path = export_method(
                db=db,
                fsr=self.fsr,
                project_id=payload.project_id,
                **(
                    payload.specific_export_job_parameters.model_dump(
                        exclude={"export_job_type"}
                    )
                    if payload.specific_export_job_parameters
                    else {}
                ),
            )

            return ExportJobOutput(
                results_url=self.fsr.get_temp_file_url(results_path.name, relative=True)
            )
