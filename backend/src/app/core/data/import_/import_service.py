from typing import Callable, Dict, Optional

import pandas as pd
from loguru import logger
from pandas import Series
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.import_job import (
    ImportJobCreate,
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
    ImportJobUpdate,
)
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta

TEMPORARY_DESCRIPTION = "temporary description"


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
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()

        cls.import_method_for_job_type: Dict[ImportJobType, Callable[..., None]] = {
            # ImportJobType.SINGLE_PROJECT_ALL_DATA: cls._import_all_data_to_proj,
            # ImportJobType.SINGLE_PROJECT_ALL_USER: cls._import_all_user_to_proj,
            ImportJobType.SINGLE_PROJECT_ALL_TAGS: cls._import_all_tags_to_proj,
            # ImportJobType.SINGLE_PROJECT_SELECTED_SDOCS: cls._import_selected_sdocs_to_proj,
            # ImportJobType.SINGLE_USER_ALL_DATA: cls._import_user_data_to_proj,
            ImportJobType.SINGLE_USER_ALL_CODES: cls._import_user_codes_to_proj,
            # ImportJobType.SINGLE_USER_ALL_MEMOS: cls._import_user_memos_to_proj,
            # ImportJobType.SINGLE_USER_LOGBOOK: cls._import_user_logbook_to_proj,
            # ImportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS: cls._import_all_user_annotations_to_sdoc,
            # ImportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS: cls._import_user_annotations_to_sdoc,
        }

        return super(ImportService, cls).__new__(cls)

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

    def __find_and_create_codes(
        self,
        row: Series,
        db: Session,
        user_id: int,
        proj_id: int,
        code_id_mapping: dict[int, int],
    ) -> Series:
        code_id = row["code_id"]
        code_name = row["code_name"]
        description = row["description"]
        color = row["color"]
        parent_code_id = row["parent_code_id"]
        created_by_user_first_name = row["created_by_user_first_name"]
        created_by_user_last_name = row["created_by_user_last_name"]
        if not (
            created_by_user_first_name == "SYSTEM"
            and created_by_user_last_name == "USER"
        ):  # is this ok, or can we update / append to system codes?
            if pd.isna(parent_code_id) or parent_code_id in code_id_mapping:
                if pd.isna(parent_code_id):
                    parent_code_id = None
                else:
                    parent_code_id = code_id_mapping[parent_code_id]
                if pd.notna(color):
                    create_code = CodeCreate(
                        name=code_name,
                        color=color,
                        description=description,
                        parent_id=parent_code_id,
                        project_id=proj_id,
                        user_id=user_id,
                    )
                else:
                    create_code = CodeCreate(
                        name=code_name,
                        description=description,
                        parent_id=parent_code_id,
                        project_id=proj_id,
                        user_id=user_id,
                    )
                code = crud_code.create(db=db, create_dto=create_code)
                code_id_mapping[code_id] = code.id
        return row

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

    def __check_parents_defined(self, df: pd.DataFrame) -> None:
        if (
            not df[df["parent_code_id"].notna()]["parent_code_id"]
            .isin(df["code_id"])
            .all()
        ):
            raise ValueError("Not all parent code ids are present in the code ids.")

    def __check_missing_values(self, df: pd.DataFrame) -> None:
        def has_missing_value(row: pd.Series) -> pd.Series:
            if pd.isna(row["code_id"]):
                raise ValueError(f"Missing code id on row {row}")
            if pd.isna(row["code_name"]):
                raise ValueError(f"Missing code name on code id {row['code_id']}")
            return row

        df.apply(has_missing_value, axis=1)

    def __check_root_clashes(
        self, df: pd.DataFrame, user_id: int, project_id: int, db: Session
    ) -> None:
        df = df[
            df["parent_code_id"].isna()
        ]  # We only have to check if one of the roots already exists, because child codes are always in another namespace.
        mask = df["code_name"].apply(
            lambda code_name: crud_code.exists_by_name_and_user_and_project_and_parent(
                db=db,
                code_name=code_name,
                user_id=user_id,
                proj_id=project_id,
                parent_id=None,
            )
        )
        if mask.any():
            raise ValueError(
                f"Some root codenames already exist for user {user_id} in project {project_id}"
            )

    def __breadth_search_sort(self, df: pd.DataFrame) -> list[pd.DataFrame]:
        layers: list[pd.DataFrame] = []
        mask = df["parent_code_id"].isna()
        while mask.any() and len(df) > 0:
            layers.append(df[mask])
            df = df[~mask]
            mask = df["parent_code_id"].isin(layers[-1]["code_id"])
        return layers

    def _import_user_codes_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        user_id = imj_parameters.user_id
        code_id_mapping: dict[str, str] = dict()
        path_to_file = self.repo._get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)
        df = df.fillna(
            value={
                "description": "",
            }
        )
        self.__check_missing_values(df)
        self.__check_parents_defined(df)
        self.__check_root_clashes(df=df, user_id=user_id, project_id=project_id, db=db)
        sorted_dfs = self.__breadth_search_sort(
            df
        )  # split the df into layers of codes starting with root codes.

        logger.info(f"Importing Code {sorted_dfs} ...")
        for layer in sorted_dfs:
            layer.apply(
                lambda row: self.__find_and_create_codes(
                    row,
                    db,
                    user_id,
                    project_id,
                    code_id_mapping=code_id_mapping,
                ),
                axis=1,
            )

    def _import_all_tags_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        user_id = imj_parameters.user_id
        code_id_mapping: dict[str, str] = dict()
        path_to_file = self.repo._get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)
        df = df.fillna(
            value={
                "description": "",
            }
        )
        self.__check_missing_values(df)
        self.__check_parents_defined(df)
        self.__check_root_clashes(df=df, user_id=user_id, project_id=project_id, db=db)
        sorted_dfs = self.__breadth_search_sort(
            df
        )  # split the df into layers of codes starting with root codes.

        logger.info(f"Importing Code {sorted_dfs} ...")
        for layer in sorted_dfs:
            layer.apply(
                lambda row: self.__find_and_create_codes(
                    row,
                    db,
                    user_id,
                    project_id,
                    code_id_mapping=code_id_mapping,
                ),
                axis=1,
            )
