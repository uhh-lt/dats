import json
import zipfile
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple, Union

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import crud_user
from app.core.data.dto.analysis import WordFrequencyResult
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.export_job import (
    ExportFormat,
    ExportJobCreate,
    ExportJobParameters,
    ExportJobRead,
    ExportJobType,
    ExportJobUpdate,
)
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.export.export_annotations import (
    generate_export_df_for_adoc,
    generate_export_df_for_sentence_annotations,
    generate_export_df_for_span_annotations,
)
from app.core.data.export.export_codes import (
    generate_export_dfs_for_all_codes_in_project,
)
from app.core.data.export.export_memos import (
    generate_export_content_for_logbook,
    generate_export_df_for_memo,
)
from app.core.data.export.export_project import generate_export_dict_for_project_details
from app.core.data.export.export_project_metadata import (
    generate_export_dfs_for_all_project_metadata_in_proj,
)
from app.core.data.export.export_sdoc_links import generate_export_dict_for_sdoc_links
from app.core.data.export.export_sdoc_metadata import (
    get_all_sdoc_metadatas_in_project_for_export,
    get_sdocs_metadata_for_export,
)
from app.core.data.export.export_sdocs import (
    get_all_raw_sdocs_files_in_project_for_export,
    get_all_sdoc_transcripts_in_project_for_export,
    get_raw_sdocs_files_for_export,
)
from app.core.data.export.export_tags import (
    generate_export_dfs_for_all_document_tags_in_project,
)
from app.core.data.export.export_users import generate_export_df_for_users_in_project
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta

PROJECT_USERS_EXPORT_NAMING_TEMPLATE = "project_{project_id}_users"
PROJECT_SDOC_METADATAS_EXPORT_NAMING_TEMPLATE = "project_{project_id}_metadatas"
PROJECT_DETAILS_EXPORT_NAMING_TEMPLATE = "project_{project_id}_details"
PROJECT_SDOC_LINKS_EXPORT_NAMING_TEMPLATE = "project_{project_id}_sdoc_links"
PROJECT_CODES_EXPORT_NAMING_TEMPLATE = "project_{project_id}_codes"
SCHEMA_JSON_EXPORT_NAME = "schema.json"


class NoDataToExportError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


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


class NoSuchExportFormatError(Exception):
    def __init__(self, export_format: str) -> None:
        super().__init__(
            (
                f"ExportFormat {export_format} not available! ",
                f"Available Formats: {[fmt.split('.')[0] for fmt in ExportFormat]}",
            )
        )


class UnsupportedExportJobTypeError(Exception):
    def __init__(self, export_job_type: ExportJobType) -> None:
        super().__init__(f"ExportJobType {export_job_type} is not supported! ")


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()

        # map from job_type to function
        cls.export_method_for_job_type: Dict[ExportJobType, Callable[..., str]] = {
            ExportJobType.SINGLE_PROJECT_ALL_DATA: cls._export_all_data_from_proj,
            ExportJobType.SINGLE_PROJECT_ALL_USER: cls._export_all_user_from_proj,
            ExportJobType.SINGLE_PROJECT_ALL_TAGS: cls._export_all_tags_from_proj,
            ExportJobType.SINGLE_PROJECT_ALL_CODES: cls._export_all_codes_from_proj,
            ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS: cls._export_selected_sdocs_from_proj,
            ExportJobType.SINGLE_PROJECT_SELECTED_SPAN_ANNOTATIONS: cls._export_selected_span_annotations_from_proj,
            ExportJobType.SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS: cls._export_selected_sentence_annotations_from_proj,
            ExportJobType.SINGLE_USER_ALL_DATA: cls._export_user_data_from_proj,
            ExportJobType.SINGLE_USER_ALL_MEMOS: cls._export_user_memos_from_proj,
            ExportJobType.SINGLE_USER_LOGBOOK: cls._export_user_logbook_from_proj,
            ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS: cls._export_all_user_annotations_from_sdoc,
            ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS: cls._export_user_annotations_from_sdoc,
            ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS: cls._export_user_annotations_from_sdoc,
        }

        return super(ExportService, cls).__new__(cls)

    def __create_export_zip(
        self, fn: Union[str, Path], exported_files: Sequence[Union[str, Path]]
    ) -> Path:
        fn = Path(fn)
        if not fn.suffix == ".zip":
            fn = fn.with_suffix(".zip")
        export_zip = self.repo.create_temp_file(fn)
        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in map(Path, exported_files):
                zipf.write(file, file.name)
        logger.debug(f"Added {len(exported_files)} files to {export_zip}")
        return export_zip

    def __write_export_data_to_temp_file(
        self,
        data: pd.DataFrame,
        export_format: ExportFormat,
        fn: Optional[str] = None,
        append_suffix: bool = False,
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn=fn)
        suffix = f".{str(export_format.value).lower()}"
        if not append_suffix:
            temp_file = temp_file.replace(temp_file.with_suffix(suffix))
        else:
            temp_file = temp_file.parent / (temp_file.name + suffix)

        logger.info(f"Writing export data to {temp_file} !")
        if export_format == ExportFormat.CSV:
            data.to_csv(temp_file, sep=",", index=False, header=True)
        elif export_format == ExportFormat.JSON:
            data.to_json(temp_file, orient="records")

        return temp_file

    def __write_exported_txt_to_temp_file(
        self,
        text: str,
        fn: Optional[str] = None,
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".txt")

        logger.info(f"Writing export data to {temp_file} !")
        with open(temp_file, "w") as f:
            f.write(text)
        return temp_file

    def __write_exported_json_to_temp_file(
        self,
        exported_file: Union[List[Dict[str, Any]], Dict[str, Any]],
        fn: Optional[str] = None,
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn=fn)
        temp_file = temp_file.parent / (temp_file.name + ".json")

        logger.info(f"Writing export data to {temp_file} !")
        with open(temp_file, "w") as f:
            json.dump(exported_file, f, indent=4)

        return temp_file

    def _export_user_annotations_from_sdoc(
        self,
        db: Session,
        user_id: int,
        sdoc_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the adoc
        adoc = crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=sdoc_id, user_id=user_id)
        export_data = generate_export_df_for_adoc(db=db, adoc=adoc)
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=f"project_{project_id}_sdoc_{sdoc_id}_adoc_{adoc.id}",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_all_user_annotations_from_sdoc(
        self,
        db: Session,
        sdoc_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the adocs
        sdoc = crud_sdoc.read(db=db, id=sdoc_id)
        all_adocs = sdoc.annotation_documents
        if len(all_adocs) == 0:
            raise NoDataToExportError(
                f"There are no annotations for SDoc {sdoc_id} in Project {project_id}"
            )

        # export the data
        export_data = pd.DataFrame()
        for adoc in all_adocs:
            adoc_data = generate_export_df_for_adoc(db=db, adoc=adoc)
            export_data = pd.concat((export_data, adoc_data))

        # write single file for all annos of that doc
        assert isinstance(export_data, pd.DataFrame)  # for surpessing the warning
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=sdoc.filename,
            append_suffix=True,
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_multiple_adocs(
        self,
        db: Session,
        adoc_ids: List[int],
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        exported_files = []
        for adoc_id in adoc_ids:
            df = generate_export_df_for_adoc(db=db, adoc_id=adoc_id)
            export_file = self.__write_export_data_to_temp_file(
                data=df,
                export_format=export_format,
                fn=f"adoc_{adoc_id}",
            )
            exported_files.append(export_file)

        # ZIP all files
        export_zip = self.__create_export_zip("adocs_export.zip", exported_files)
        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_user_memos_from_proj(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the memo
        memos = crud_memo.read_by_user_and_project(
            db=db, user_id=user_id, proj_id=project_id, only_starred=False
        )
        if len(memos) == 0:
            raise NoDataToExportError(
                f"There are no memos for User {user_id} in Project {project_id}!"
            )

        export_data = pd.DataFrame()
        for memo in memos:
            memo_data = generate_export_df_for_memo(db=db, memo_id=memo.id, memo=memo)
            export_data = pd.concat((export_data, memo_data))

        assert isinstance(export_data, pd.DataFrame)  # for surpessing the warning
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=f"user_{user_id}_memos",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def __generate_export_dfs_for_user_data_in_project(
        self,
        db: Session,
        user_id: int,
        project_id: int,
    ) -> Tuple[List[Tuple[str, pd.DataFrame]], List[pd.DataFrame]]:
        logger.info(f"Exporting data of User {user_id} in Project {project_id} ...")
        user = crud_user.read(db=db, id=user_id)

        # all AnnotationDocuments
        adocs = user.annotation_documents
        exported_adocs: List[Tuple[str, pd.DataFrame]] = []
        for adoc in adocs:
            if adoc.source_document.project_id == project_id:
                export_data = generate_export_df_for_adoc(db=db, adoc_id=adoc.id)
                exported_adocs.append((adoc.source_document.filename, export_data))

        # all Memos
        memos = user.memos
        exported_memos: List[pd.DataFrame] = []
        for memo in memos:
            if memo.project_id == project_id:
                export_data = generate_export_df_for_memo(db=db, memo_id=memo.id)
                exported_memos.append(export_data)

        return exported_adocs, exported_memos

    def _export_user_data_from_proj(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        (
            exported_adocs,
            exported_memos,
        ) = self.__generate_export_dfs_for_user_data_in_project(
            db=db, user_id=user_id, project_id=project_id
        )

        exported_tags = generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )
        logbook_content = generate_export_content_for_logbook(
            db=db, project_id=project_id, user_id=user_id
        )

        exported_files = []
        # one file per adoc
        for sdoc_name, adoc_df in exported_adocs:
            export_file = self.__write_export_data_to_temp_file(
                data=adoc_df,
                export_format=export_format,
                fn=f"adoc_{sdoc_name}",
            )
            exported_files.append(export_file)

        # one file for all memos
        if len(exported_memos) > 0:
            exported_memo_df = pd.concat(exported_memos)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_memo_df,
                export_format=export_format,
                fn=f"user_{user_id}_memo",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Memos to export for User {user_id} in Project {project_id}"
            logger.warning(msg)

        # one file for all tags
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_tag_df,
                export_format=export_format,
                fn=f"project_{project_id}_tags",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Tags to export in Project {project_id}"
            logger.warning(msg)

        # one file for the logbook
        logbook_file = self.repo.create_temp_file(
            f"project_{project_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"project_{project_id}_user_{user_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_all_data_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        logger.info(f"Exporting all user data from Project {project_id} ...")
        proj = crud_project.read(db=db, id=project_id)
        users = proj.users

        exported_adocs: Dict[str, List[pd.DataFrame]] = dict()
        exported_memos: List[pd.DataFrame] = []
        exported_logbooks: List[Tuple[int, str]] = []
        exported_files = []

        logger.info("exporting user data...")
        # generate all users in project data
        exported_users = generate_export_df_for_users_in_project(
            db=db, project_id=project_id
        )

        # generate project details
        logger.info("exporting project details...")
        exported_project_details = generate_export_dict_for_project_details(
            db=db, project_id=project_id
        )
        # write project details to files
        project_file = self.__write_exported_json_to_temp_file(
            exported_file=exported_project_details,
            fn=PROJECT_DETAILS_EXPORT_NAMING_TEMPLATE.format(project_id=project_id),
        )
        exported_files.append(project_file)

        logger.info("exporting user memos...")
        for user in users:
            (
                ex_adocs,
                ex_memos,
            ) = self.__generate_export_dfs_for_user_data_in_project(
                db=db, user_id=user.id, project_id=project_id
            )

            # one memo df per user
            if len(ex_memos) > 0:
                exported_memos.append(pd.concat(ex_memos))

            # one logbook content string per user
            exported_logbooks.append(
                (
                    user.id,
                    generate_export_content_for_logbook(
                        db=db, project_id=project_id, user_id=user.id
                    ),
                )
            )

            # group  the adocs by sdoc name and merge them later
            for sdoc_name, adoc_df in ex_adocs:
                if sdoc_name not in exported_adocs:
                    exported_adocs[sdoc_name] = []
                exported_adocs[sdoc_name].append(adoc_df)
        # merge adocs
        merged_exported_adocs: List[Tuple[str, pd.DataFrame]] = []
        for sdoc_name in exported_adocs.keys():
            merged_exported_adocs.append(
                (sdoc_name, pd.concat(exported_adocs[sdoc_name]))
            )

        # write users to files
        users_file = self.__write_export_data_to_temp_file(
            data=exported_users,
            export_format=export_format,
            fn=PROJECT_USERS_EXPORT_NAMING_TEMPLATE.format(project_id=project_id),
        )
        exported_files.append(users_file)

        # write adocs to files
        for sdoc_name, adoc_df in merged_exported_adocs:
            export_file = self.__write_export_data_to_temp_file(
                data=adoc_df,
                export_format=export_format,
                fn=sdoc_name,
                append_suffix=True,
            )
            exported_files.append(export_file)

        # write memos to files
        for memo_df in exported_memos:
            logger.info(f"Export memo {memo_df}")
            export_file = self.__write_export_data_to_temp_file(
                data=memo_df,
                export_format=export_format,
                fn=f"user_{memo_df.iloc[0].user_id}_memo",
            )
            exported_files.append(export_file)

        # write logbooks to files
        for user_id, logbook_content in exported_logbooks:
            logbook_file = self.repo.create_temp_file(f"user_{user_id}_logbook.md")
            logbook_file.write_text(logbook_content)
            exported_files.append(logbook_file)

        # write codes to files
        export_file = self._export_all_codes_from_proj(
            db=db, project_id=project_id, export_format=export_format
        )
        exported_files.append(export_file)

        logger.info("exporting document tags...")
        # write all tags to one file
        exported_tags = generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
        else:
            exported_tag_df = pd.DataFrame(
                columns=[
                    "tag_name",
                    "description",
                    "color",
                    "created",
                    "parent_tag_name",
                    "applied_to_sdoc_filenames",
                ]
            )
        export_file = self.__write_export_data_to_temp_file(
            data=exported_tag_df,
            export_format=export_format,
            fn=f"project_{project_id}_tags",
        )
        exported_files.append(export_file)

        # write all project metadata to one file
        exported_project_metadata = (
            generate_export_dfs_for_all_project_metadata_in_proj(
                db=db, project_id=project_id
            )
        )
        if len(exported_project_metadata) > 0:
            export_file = self.__write_export_data_to_temp_file(
                data=exported_project_metadata,
                export_format=export_format,
                fn=PROJECT_SDOC_METADATAS_EXPORT_NAMING_TEMPLATE.format(
                    project_id=project_id
                ),
            )
            exported_files.append(export_file)

        logger.info("exporting raw sdocs...")
        # add all raw sdocs to export
        sdoc_files = get_all_raw_sdocs_files_in_project_for_export(
            db=db, repo=self.repo, project_id=project_id
        )
        exported_files.extend(sdoc_files)

        # check if adoc export documents are missing (empty)
        for sdoc_file in sdoc_files:
            sdoc_name = sdoc_file.name
            if sdoc_name not in exported_adocs:
                empty_adoc_df = generate_export_df_for_adoc(db=db)
                export_file = self.__write_export_data_to_temp_file(
                    data=empty_adoc_df,
                    export_format=export_format,
                    fn=sdoc_name,
                    append_suffix=True,
                )
                exported_files.append(export_file)

        # add sdoc transcripts (txt)
        exported_transcripts = get_all_sdoc_transcripts_in_project_for_export(
            db=db, project_id=project_id
        )
        for filename, word_level_transcriptions in exported_transcripts:
            exported_file = self.__write_exported_json_to_temp_file(
                exported_file=word_level_transcriptions,
                fn=filename + ".transcript",
            )
            exported_files.append(exported_file)

        # add the sdoc metadatafiles (jsons)
        exported_sdocs_metadata = get_all_sdoc_metadatas_in_project_for_export(
            db=db, project_id=project_id
        )
        for exported_sdoc_metadata in exported_sdocs_metadata:
            exported_file = self.__write_exported_json_to_temp_file(
                exported_file=exported_sdoc_metadata,
                fn=exported_sdoc_metadata["filename"] + ".metadata",
            )
            exported_files.append(exported_file)

        exported_sdoc_links = generate_export_dict_for_sdoc_links(
            db=db, project_id=project_id
        )
        exported_file = self.__write_export_data_to_temp_file(
            data=exported_sdoc_links,
            export_format=export_format,
            fn=PROJECT_SDOC_LINKS_EXPORT_NAMING_TEMPLATE.format(project_id=project_id),
        )
        exported_files.append(exported_file)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"project_{project_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_all_user_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        users_df = generate_export_df_for_users_in_project(db=db, project_id=project_id)
        export_file = self.__write_export_data_to_temp_file(
            data=users_df,
            export_format=export_format,
            fn=PROJECT_USERS_EXPORT_NAMING_TEMPLATE.format(project_id=project_id),
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_user_logbook_from_proj(
        self, db: Session, project_id: int, user_id: int
    ) -> str:
        # special handling for LogBook memos: we export is as single MarkDown File
        logbook_content = generate_export_content_for_logbook(
            db=db, project_id=project_id, user_id=user_id
        )
        # create the logbook file
        logbook_file = self.repo.create_temp_file(
            f"project_{project_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)
        return self.repo.get_temp_file_url(logbook_file.name, relative=True)

    def _export_all_tags_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        ex_tags = generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )

        # one file for all tags
        if len(ex_tags) > 0:
            export_data = pd.concat(ex_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=export_data,
                export_format=export_format,
                fn=f"project_{project_id}_tags",
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No DocumentTags to export in Project {project_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def _export_all_codes_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        ex_codes = generate_export_dfs_for_all_codes_in_project(
            db=db, project_id=project_id
        )

        # one file for all codes
        if len(ex_codes) > 0:
            export_data = pd.concat(ex_codes)
            export_file = self.__write_export_data_to_temp_file(
                data=export_data,
                export_format=export_format,
                fn=f"project_{project_id}_codes",
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No Codes to export in Project {project_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def __get_sdoc_metadata_files_for_export(
        self,
        db: Session,
        project_id: int,
        sdoc_ids: List[int],
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> List[Path]:
        sdocs = [
            SourceDocumentRead.model_validate(sdoc)
            for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        ]

        sdocs_metadata = get_sdocs_metadata_for_export(db=db, sdocs=sdocs)
        files = []
        for sdoc_metadata in sdocs_metadata:
            files.append(
                self.__write_exported_json_to_temp_file(
                    exported_file=sdoc_metadata,
                    fn=sdoc_metadata["filename"],
                )
            )
        project_metadata = generate_export_dfs_for_all_project_metadata_in_proj(
            db=db, project_id=project_id
        )
        # we filter by the metadata actually present in the exported sdocs.
        metadata_ids_in_sdocs = set()
        for sdoc_metadata in sdocs_metadata:
            for metadata in sdoc_metadata["metadata"].values():
                metadata_ids_in_sdocs.add(metadata["id"])
        project_metadata = project_metadata[
            project_metadata.apply(
                lambda row: row["id"] in metadata_ids_in_sdocs, axis=1
            )
        ]
        if len(project_metadata) > 0:
            files.append(
                self.__write_export_data_to_temp_file(
                    project_metadata,
                    export_format=export_format,
                    fn=PROJECT_SDOC_METADATAS_EXPORT_NAMING_TEMPLATE.format(
                        project_id=project_id
                    ),
                )
            )
        return files

    def _export_selected_sdocs_from_proj(
        self,
        db: Session,
        project_id: int,
        sdoc_ids: List[int],
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        files = get_raw_sdocs_files_for_export(db, repo=self.repo, sdoc_ids=sdoc_ids)
        files.extend(
            self.__get_sdoc_metadata_files_for_export(
                db=db,
                project_id=project_id,
                sdoc_ids=sdoc_ids,
                export_format=export_format,
            )
        )
        zip = self.__create_export_zip(
            f"{len(files)}_exported_documents_project_{project_id}.zip", files
        )
        return self.repo.get_temp_file_url(zip.name, relative=True)

    def _export_selected_span_annotations_from_proj(
        self, db: Session, project_id: int, span_annotation_ids: List[int]
    ) -> str:
        # get the annotations
        span_annotations = crud_span_anno.read_by_ids(db=db, ids=span_annotation_ids)

        export_data = generate_export_df_for_span_annotations(
            db=db, span_annotations=span_annotations
        )
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=ExportFormat.CSV,
            fn=f"project_{project_id}_selected_span_annotations_export",
        )
        return self.repo.get_temp_file_url(export_file.name, relative=True)

    def _export_selected_sentence_annotations_from_proj(
        self, db: Session, project_id: int, sentence_annotation_ids: List[int]
    ) -> str:
        # get the annotations
        sentence_annotations = crud_sentence_anno.read_by_ids(
            db=db, ids=sentence_annotation_ids
        )

        export_data = generate_export_df_for_sentence_annotations(
            db=db, sentence_annotations=sentence_annotations
        )
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=ExportFormat.CSV,
            fn=f"project_{project_id}_selected_sentence_annotations_export",
        )
        return self.repo.get_temp_file_url(export_file.name, relative=True)

    def _assert_all_requested_data_exists(
        self, export_params: ExportJobParameters
    ) -> None:
        # TODO check all job type specific parameters
        assert export_params.export_format is not None
        if export_params.export_format.value not in set(i.value for i in ExportFormat):
            raise NoSuchExportFormatError(
                export_format=export_params.export_format.value
            )

        with self.sqls.db_session() as db:
            crud_project.exists(
                db=db,
                id=export_params.specific_export_job_parameters.project_id,
                raise_error=True,
            )

    def prepare_export_job(self, export_params: ExportJobParameters) -> ExportJobRead:
        self._assert_all_requested_data_exists(export_params=export_params)

        exj_create = ExportJobCreate(parameters=export_params)
        print(exj_create)
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

        # TODO: parse the parameters and run the respective method
        try:
            with self.sqls.db_session() as db:
                # get the export method based on the jobtype
                export_method = self.export_method_for_job_type.get(
                    exj.parameters.export_job_type, None
                )
                if export_method is None:
                    raise UnsupportedExportJobTypeError(exj.parameters.export_job_type)

                # execute the export_method with the provided specific parameters
                results_url = export_method(
                    self=self,
                    db=db,
                    **exj.parameters.specific_export_job_parameters.model_dump(
                        exclude={"export_job_type"}
                    ),
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

    def export_word_frequencies(
        self,
        project_id: int,
        wf_result: WordFrequencyResult,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # construct data frame
        data = {
            "word": [],
            "word_percent": [],
            "count": [],
            "sdocs": [],
            "sdocs_percent": [],
        }
        for wf in wf_result.word_frequencies:
            data["word"].append(wf.word)
            data["word_percent"].append(wf.word_percent)
            data["count"].append(wf.count)
            data["sdocs"].append(wf.sdocs)
            data["sdocs_percent"].append(wf.sdocs_percent)
        df = pd.DataFrame(data=data)

        # export the data frame
        export_file = self.__write_export_data_to_temp_file(
            data=df,
            export_format=export_format,
            fn=f"project_{project_id}_word_frequency_export",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url
