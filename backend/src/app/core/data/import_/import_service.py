import json
import re
import zipfile
from os import listdir
from os.path import isfile, join
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set, Tuple

import pandas as pd
from celery import group
from loguru import logger
from pandas import Series
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.project import crud_project
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import (
    DocType,
    get_doc_type,
    get_mime_type_from_file,
    mime_type_supported,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.document_tag import DocumentTagCreate
from app.core.data.dto.import_job import (
    ImportJobCreate,
    ImportJobParameters,
    ImportJobRead,
    ImportJobType,
    ImportJobUpdate,
)
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadCreateWithoutPreproJobId,
)
from app.core.data.dto.project import ProjectUpdate
from app.core.data.dto.project_metadata import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
)
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.orm.project import ProjectORM
from app.core.data.repo.repo_service import (
    RepoService,
)
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.ray_model_service import RayModelService
from app.util.singleton_meta import SingletonMeta

TEMPORARY_DESCRIPTION = "temporary description"

FILETYPE_REGEX = [
    (r"project_\d+_details.json", "project_details", True),
    (r"project_\d+_metadatas.csv", "project_metadatas", True),
    (r"project_\d+_codes.csv", "codes", True),
    (r"project_\d+_sdoc_links.csv", "sdoc_links", True),
    (r"project_\d+_tags.csv", "tags", True),
    (r"project_\d+_users.csv", "users", True),
    (r"user_\d+_logbook.md", "logbook", True),
    (r"\w+.csv", "sdoc_annotations", False),
    (r"\w+.json", "sdoc_metadatas", False),
]

SDOC_FILE_TYPES = ["sdoc", "sdoc_annotations", "sdoc_metadatas"]


class ImportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the Import Job! {cause}")


class ImportFileMissingException(Exception):
    def __init__(self, file_type: str):
        super().__init__(f"Cannot find {file_type} in import zip.")


class ImportSDocFileMissingException(Exception):
    def __init__(self, file_name: str, file_type: str):
        super().__init__(f"Cannot find {file_type} for {file_name} in import zip.")


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


class ImportSDocFileUnsupportedMimeTypeException(Exception):
    def __init__(self, sdoc_name: str, mime_type: str) -> None:
        super().__init__(
            f"Expected sdoc file {sdoc_name} to be of mime types: {DocType}, but got {mime_type} instead."
        )


class ImportAnnotationsEmptyException(Exception):
    def __init__(self, filename) -> None:
        super().__init__(f"The uploaded annotation file {filename} is empty.")


class ImportAdocSpanInvalidValueException(Exception):
    def __init__(self, key: str, value) -> None:
        super().__init__(f"The value {str(value)} is not valid for key {key}.")


class ImportAdocInvalidCodeIdException(Exception):
    def __init__(self, code_id: int) -> None:
        super().__init__(f"There is no code with id {code_id} found in this project.")


class ImportAdocBBoxInvalidValueException(Exception):
    def __init__(self, key: str, value) -> None:
        super().__init__(f"The value {str(value)} is not valid for key {key}.")


class ProjectImportFileSorter:
    def __init__(self, filenames: List[str]) -> None:
        self.__filenames = filenames


class SDocBundle:
    def add_filename(self, field_name: str, filename: str):
        pass


class ImportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()

        cls.import_method_for_job_type: Dict[ImportJobType, Callable[..., None]] = {
            # ImportJobType.SINGLE_PROJECT_ALL_DATA: cls._import_all_data_to_proj,
            # ImportJobType.SINGLE_PROJECT_ALL_USER: cls._import_all_user_to_proj,
            ImportJobType.SINGLE_PROJECT_ALL_TAGS: cls._import_all_tags_to_proj,
            # ImportJobType.SINGLE_PROJECT_SELECTED_SDOCS: cls._import_selected_sdocs_to_proj,
            # ImportJobType.SINGLE_USER_ALL_DATA: cls._import_user_data_to_proj,
            ImportJobType.SINGLE_USER_ALL_CODES: cls._import_codes_to_proj,
            ImportJobType.SINGLE_PROJECT: cls._import_project,
            ImportJobType.SINGLE_PROJECT_ALL_METADATA: cls._import_all_project_metadata,
            ImportJobType.SINGLE_PROJECT_ALL_PROJECT_PROJECT_METADATA: cls._import_sdoc_metadatas_to_project,
            # ImportJobType.SINGLE_USER_ALL_MEMOS: cls._import_user_memos_to_proj,
            # ImportJobType.SINGLE_USER_LOGBOOK: cls._import_user_logbook_to_proj,
            # ImportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS: cls._import_all_user_annotations_to_sdoc,
            # ImportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS: cls._import_user_annotations_to_sdoc,
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

    def __create_code_if_not_exists(
        self,
        row: Series,
        db: Session,
        proj_id: int,
        code_id_mapping: dict[str, int],
    ) -> Series:
        parent_code_name = row["parent_code_name"]
        description = row["description"]
        color = row["color"]
        parent_code_id = (
            code_id_mapping[parent_code_name] if pd.notna(parent_code_name) else None
        )
        code_read = crud_code.read_by_name_and_project(
            db=db, code_name=row["code_name"], proj_id=proj_id
        )
        if code_read:
            if not (code_read.parent_id == parent_code_id):
                raise ValueError(
                    f"Trying to map imported code on already existing code, and expected parent id to be {code_read.parent_id}, but got {parent_code_id} instead."
                )
            if not (code_read.description == description):
                raise ValueError(
                    f"Trying to map imported code on already existing code, and expected description to be {code_read.description}, but got {description} instead."
                )
            # if not (code_read.color == color):
            #     raise ValueError(
            #         f"Trying to map imported tag on already existing tag, and expected color to be {code_read.color}, but got {color} instead."
            #     ) TODO: To discuss
            code = code_read
        else:
            create_code = CodeCreate(
                name=row["code_name"],
                description=description,
                parent_id=parent_code_id,
                project_id=proj_id,
                is_system=False,
                **({"color": color} if pd.notna(color) else {}),
            )
            code = crud_code.create(db=db, create_dto=create_code)
        code_id_mapping[row["code_name"]] = code.id
        logger.info(f"create code {code.as_dict()}")
        return row

    def __create_tag_if_not_exists(
        self,
        row: Series,
        db: Session,
        proj_id: int,
        tag_id_mapping: dict[str, int],
    ) -> Series:
        tag_name = row["tag_name"]
        description = row["description"]
        color = row["color"]
        parent_tag_name = row["parent_tag_name"]

        # either set parent_tag_name on python None or on the mapped new id of the tag
        parent_tag_id = (
            tag_id_mapping[parent_tag_name] if pd.notna(parent_tag_name) else None
        )
        tag_read = crud_document_tag.read_by_name_and_project(
            db=db, name=tag_name, project_id=proj_id
        )
        if tag_read:
            if not (tag_read.parent_id == parent_tag_id):
                raise ValueError(
                    f"Trying to map imported tag on already existing tag, and expected parent id to be {tag_read.parent_id}, but got {parent_tag_id} instead."
                )
            if not (tag_read.description == description):
                raise ValueError(
                    f"Trying to map imported tag on already existing tag, and expected description to be {tag_read.description}, but got {description} instead."
                )
            # if not (tag_read.color == color):
            #     raise ValueError(
            #         f"Trying to map imported tag on already existing tag, and expected color to be {tag_read.description}, but got {color} instead."
            #     ) TODO: To discuss if we should not check for color, because the system inits them randomly
            tag = tag_read
        else:
            # Generate DocumentTagCreate dto either with color or without
            kwargs = {
                "name": tag_name,
                "description": description,
                "parent_id": parent_tag_id,
                "project_id": proj_id,
            }
            if pd.notna(color):
                kwargs["color"] = color
            create_tag = DocumentTagCreate(**kwargs)
            tag = crud_document_tag.create(db=db, create_dto=create_tag)
        tag_id_mapping[tag_name] = tag.id
        logger.info(f"import tag {tag.as_dict()}")
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

    def __check_code_parents_defined(self, df: pd.DataFrame) -> None:
        if (
            not df[df["parent_code_name"].notna()]["parent_code_name"]
            .isin(df["code_name"])
            .all()
        ):
            raise ValueError("Not all parent code ids are present in the code ids.")

    def __check_tag_parents_defined(self, df: pd.DataFrame) -> None:
        if (
            not df[df["parent_tag_name"].notna()]["parent_tag_name"]
            .isin(df["tag_name"])
            .all()
        ):
            raise ValueError("Not all parent tag ids are present in the tag ids.")

    def __check_code_missing_values(self, df: pd.DataFrame) -> None:
        if df["code_name"].isna().any():
            raise ValueError(f"Missing code_name on rows: {df[df['code_name'].isna()]}")

    def __check_tag_missing_values(self, df: pd.DataFrame) -> None:
        if df["tag_name"].isna().any():
            raise ValueError(f"Missing tag_name on rows: {df[df['tag_name'].isna()]}")

    def __check_code_duplicates(self, df: pd.DataFrame):
        if df["code_name"].duplicated().any():
            raise ValueError(
                f"Some codenames are duplicated: {df['code_name'][df['code_name'].duplicated()].unique()}"
            )

    def __check_tag_duplicates(self, df: pd.DataFrame) -> None:
        if df["tag_name"].duplicated().any():
            raise ValueError(
                f"Some tag_names are duplicated: {df['tag_name'][df['tag_name'].duplicated()].unique()}"
            )

    def __code_breadth_search_sort(self, df: pd.DataFrame) -> list[pd.DataFrame]:
        layers: list[pd.DataFrame] = []
        mask = df["parent_code_name"].isna()
        while mask.any() and len(df) > 0:
            layers.append(df[mask])
            df = df[~mask]
            mask = df["parent_code_name"].isin(layers[-1]["code_name"])
        return layers

    def __tag_breadth_search_sort(self, df: pd.DataFrame) -> list[pd.DataFrame]:
        layers: list[pd.DataFrame] = []
        mask = df["parent_tag_name"].isna()
        while mask.any() and len(df) > 0:
            layers.append(df[mask])
            df = df[~mask]
            mask = df["parent_tag_name"].isin(layers[-1]["tag_name"])
        return layers

    def __import_project_metadata(self, row: Series, db: Session, proj_id: int) -> None:
        key = row["key"]
        metatype = row["metatype"]
        doctype = row["doctype"]
        description = row["description"]
        exists = crud_project_meta.exists_by_project_and_key_and_metatype_and_doctype(
            db=db, project_id=proj_id, key=key, metatype=metatype, doctype=doctype
        )
        if not exists:
            crud_create = crud_project_meta.create(
                db=db,
                create_dto=ProjectMetadataCreate(
                    key=key,
                    metatype=metatype,
                    doctype=doctype,
                    project_id=proj_id,
                    description=description,
                ),
            )
            metadata_read = ProjectMetadataRead.model_validate(crud_create)

            logger.info(f"imported project metadata {metadata_read}")

    def __update_project_details(
        self,
        db: Session,
        project_details: Dict[str, str],
        project_id: int,
        user_id: int,
    ) -> ProjectORM:
        assert "title" in project_details
        assert "description" in project_details
        title = project_details["title"]
        description = project_details["description"]
        assert title != ""
        if crud_project.exists_by_user_and_title(db=db, user_id=user_id, title=title):
            new_title = f"{title} (1)"
            counter = 1
            while crud_project.exists_by_user_and_title(
                db=db, user_id=user_id, title=new_title
            ):
                counter += 1
                new_title = f"{title}({counter})"
        else:
            new_title = title
        project_update = ProjectUpdate(title=new_title, description=description)
        logger.info(f"updated project {project_update}")
        return crud_project.update(db=db, id=project_id, update_dto=project_update)

    def _import_codes_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        path_to_file = self.repo._get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)
        self.__import_codes_to_proj(db=db, df=df, project_id=project_id)

    def __import_codes_to_proj(
        self,
        db: Session,
        df: pd.DataFrame,
        project_id: int,
    ):
        df = df.fillna(  # TODO: This field should not be optional and should be empty string on default...
            value={
                "description": "",
            }
        )
        self.__check_code_missing_values(df)
        self.__check_code_parents_defined(df)
        self.__check_code_duplicates(df)
        sorted_dfs = self.__code_breadth_search_sort(
            df
        )  # split the df into layers of codes starting with root codes.

        code_id_mapping: dict[str, int] = dict()
        logger.info(f"Importing codes sorted by depth {sorted_dfs} ...")
        for layer in sorted_dfs:
            for _, row in layer.iterrows():
                self.__create_code_if_not_exists(
                    row,
                    db,
                    project_id,
                    code_id_mapping=code_id_mapping,
                )
        logger.info(f"Generated code id mapping {code_id_mapping}")
        return code_id_mapping

    def _import_all_tags_to_proj(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        project_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        path_to_file = self.repo._get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)
        self.__import_tags_to_proj(db=db, df=df, proj_id=project_id)

    def __import_tags_to_proj(
        self, db: Session, df: pd.DataFrame, proj_id: int
    ) -> Dict[str, int]:
        tag_id_mapping: Dict[str, int] = dict()
        df = df.fillna(  # TODO: This field should not be optional and should be empty string on default...
            value={
                "description": "",
            }
        )
        self.__check_tag_missing_values(df)
        self.__check_tag_parents_defined(df)
        self.__check_tag_duplicates(df)
        sorted_dfs = self.__tag_breadth_search_sort(
            df
        )  # split the df into layers of tags starting with root tags.

        logger.info(f"Importing Tags sorted by depth {sorted_dfs} ...")
        for layer in sorted_dfs:
            for _, row in layer.iterrows():
                self.__create_tag_if_not_exists(
                    row,
                    db,
                    proj_id,
                    tag_id_mapping=tag_id_mapping,
                )

        logger.info(f"Generated tag id mapping {tag_id_mapping}")
        return tag_id_mapping

    def _import_project(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        proj_id = imj_parameters.proj_id
        user_id = imj_parameters.user_id
        try:
            filename = imj_parameters.filename
            path_to_zip_file = self.repo._get_dst_path_for_temp_file(filename)
            path_to_temp_import_dir = self.repo.create_temp_dir(
                f"import_user_{user_id}_project_{proj_id}"
            )
            self.__unzip(
                path_to_zip_file=path_to_zip_file, unzip_target=path_to_temp_import_dir
            )
            """
                expected_files = {
                    "project_details": project_details.json
                    "project_metadatas": project_metadatas.csv
                    "codes": project_codes.csv
                    "sdoc_links": project_sdoc_links.csv
                    "tags": project_tags.csv
                }
                // das abrauchst du intern aufjeden fall
                sdoc_filepaths = {
                    "sdoc_filename":{
                        "sdoc": filename.html,
                        "sdoc_metadatas": filename.json
                        "sdoc_annotations": filename.csv
                    }
                }


            """
            expected_file_paths, sdoc_filepaths = self.__read_import_project_files(
                temp_proj_path=path_to_temp_import_dir
            )
            logger.info("unzipped imported project")
            # logger.info(json.dumps(expected_file_paths, indent=4))
            logger.info(expected_file_paths)
            logger.info(" ")
            # logger.info(json.dumps(sdoc_filepaths, indent=4))
            logger.info(sdoc_filepaths)
            # import project details
            with open(expected_file_paths["project_details"], "r") as f:
                project_details = json.load(f)
            self.__update_project_details(
                db=db,
                project_details=project_details,
                project_id=proj_id,
                user_id=user_id,
            )
            # import project metadata
            metadata_mapping_df = pd.read_csv(expected_file_paths["project_metadatas"])
            for _, row in metadata_mapping_df.iterrows():
                self.__import_project_metadata(row, db=db, proj_id=proj_id)

            # import codes
            codes_df = pd.read_csv(expected_file_paths["codes"])
            self.__import_codes_to_proj(db=db, df=codes_df, project_id=proj_id)

            # import tags
            tags_df = pd.read_csv(expected_file_paths["tags"])
            tags_id_mapping = self.__import_tags_to_proj(
                db=db, df=tags_df, proj_id=proj_id
            )

            # read sdoc links
            sdoc_links = pd.read_csv(expected_file_paths["sdoc_links"])

            payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId] = []

            # all of following sdoc specific objects need to go into a dict that maps from doc_type to the list of objects.
            # The order in which they come, will be similar as the order in which the cargs are generated from the payloads.
            annotations: List[Set[AutoSpan]] = []
            bboxes: List[Set[AutoBBox]] = []
            metadatas: Dict[DocType, List[Dict]] = {
                doc_type: [] for doc_type in DocType
            }
            tags: Dict[DocType, List[List[int]]] = {
                doc_type: [] for doc_type in DocType
            }
            link_dtos: Dict[DocType, List[List[SourceDocumentLinkCreate]]] = {
                doc_type: [] for doc_type in DocType
            }

            # 1 import sdoc annotations, tags, metadata and sdoc links and create payloads
            for sdoc_name, sdoc_package in sdoc_filepaths.items():
                # get doc type from mime type
                mime_type = get_mime_type_from_file(sdoc_package["sdoc"])
                if not mime_type_supported(mime_type):
                    raise ImportSDocFileUnsupportedMimeTypeException(
                        sdoc_name, mime_type
                    )
                sdoc_doctype = get_doc_type(mime_type)
                assert sdoc_doctype, "Expected Doctype to be not None."

                # move raw sdocs
                sdoc_filepath = sdoc_package["sdoc"]
                assert isinstance(sdoc_filepath, Path)
                sdoc_filepath = self.repo.move_file_to_project_sdoc_files(
                    proj_id, sdoc_filepath
                )

                # create payloads with all sdocs
                payload = PreprocessingJobPayloadCreateWithoutPreproJobId(
                    project_id=proj_id,
                    filename=sdoc_filepath.name,
                    mime_type=mime_type,
                    doc_type=sdoc_doctype,
                )
                logger.info(f"Generate Payload dto {payload}")
                payloads.append(payload)

                # import sdoc metadata values
                sdoc_metadata_filepath = sdoc_package["sdoc_metadatas"]
                with open(sdoc_metadata_filepath, "r") as f:
                    sdoc_metadata: Dict = json.load(f)
                metadatas[sdoc_doctype].append(
                    {
                        metadata_key: metadata_attributes["value"]
                        for metadata_key, metadata_attributes in sdoc_metadata[
                            "metadata"
                        ].items()
                    }
                )
                logger.info(f"Generate sdoc metadata {metadatas[sdoc_doctype][-1]}")

                # import sdoc tags
                tags_for_sdoc: List[int] = []
                for tag in sdoc_metadata["tags"]:
                    tags_for_sdoc.append(tags_id_mapping[tag])
                tags[sdoc_doctype].append(tags_for_sdoc)
                logger.info(f"Generate sdoc tags {tags_for_sdoc}")

                # import sdoc annotations
                sdoc_annotations_filepath = sdoc_package["sdoc_annotations"]
                sdoc_annotations_df = pd.read_csv(sdoc_annotations_filepath)
                logger.info(f"The doctype is {sdoc_doctype}")
                if sdoc_doctype == DocType.text:
                    # create AutoSpans for NER
                    annotations_for_sdoc: set[AutoSpan] = set()
                    for _, row in sdoc_annotations_df.iterrows():
                        auto = AutoSpan(
                            code=row["code_name"],
                            start=row["text_begin_char"],
                            end=row["text_end_char"],
                            text=row["text"],
                            start_token=row["text_begin_token"],
                            end_token=row["text_end_token"],
                        )
                        annotations_for_sdoc.add(auto)
                    annotations.append(annotations_for_sdoc)
                    logger.info(f"Generate sdoc annotations {annotations_for_sdoc}")

                elif sdoc_doctype == DocType.image:
                    # create boundig boxes for object detection
                    bboxes_for_sdoc: Set[AutoBBox] = set()
                    for _, row in sdoc_annotations_df.iterrows():
                        bbox = AutoBBox(
                            code=row["code_name"],
                            x_min=row["bbox_x_min"],
                            y_min=row["bbox_y_min"],
                            x_max=row["bbox_x_max"],
                            y_max=row["bbox_x_max"],
                        )
                        bboxes_for_sdoc.add(bbox)
                    bboxes.append(bboxes_for_sdoc)

                # create sdoc link create dtos
                link_dtos_for_sdoc: List[SourceDocumentLinkCreate] = []
                for linked_sdoc in sdoc_links[
                    (
                        sdoc_links["linked_source_document_filename"]
                        == sdoc_filepath.name
                    )
                    | (sdoc_links["sdoc_filename"] == sdoc_filepath.name)
                ]["linked_source_document_filename"]:
                    link_dtos_for_sdoc.append(
                        SourceDocumentLinkCreate(
                            linked_source_document_filename=linked_sdoc,
                            parent_source_document_id=None,
                        )
                    )
                link_dtos[sdoc_doctype].append(link_dtos_for_sdoc)
                logger.info(f"Generate sdoc links {link_dtos_for_sdoc}")

            # 2. Create preprojob
            from app.preprocessing.preprocessing_service import PreprocessingService

            pps: PreprocessingService = PreprocessingService()
            ppj = pps._create_and_store_preprocessing_job(proj_id, payloads)

            # 3. Create cargos
            cargos = pps._create_pipeline_cargos_from_preprocessing_job_with_data(
                ppj=ppj,
                metadatas=metadatas,
                annotations=annotations,
                bboxes=bboxes,
                sdoc_links=link_dtos,
                tags=tags,
            )

            # 4. init text piplines
            from app.celery.background_jobs.tasks import (
                execute_text_preprocessing_pipeline_task,
            )

            text_tasks = [
                execute_text_preprocessing_pipeline_task.s(cargo, is_init=False)
                for cargo in cargos[DocType.text]
            ]

            # 5. init image pipelines
            # image_tasks = [
            #     execute_image_preprocessing_pipeline_task.s(cargo, is_init=False)
            #     for cargo in cargos[DocType.image]
            # ]

            # combine all tasks in one group
            tasks = text_tasks
            gr = group(tasks)()
            logger.info(f"-------------{gr}")

        except Exception as e:
            crud_project.remove(db=db, id=proj_id)
            raise e

    def __span_import_preconditions_met(
        self, text, text_begin_char, text_end_char, text_begin_token, text_end_token
    ):
        if not isinstance(text, str) or text == "":
            raise ImportAdocSpanInvalidValueException("text", text)
        if not isinstance(text_begin_char, int) or text_begin_char < 0:
            raise ImportAdocSpanInvalidValueException(
                "text_begin_char", text_begin_char
            )
        if not isinstance(text_end_char, int) or text_end_char <= 0:
            raise ImportAdocSpanInvalidValueException("text_end_char", text_end_char)
        if not text_end_char > text_begin_char:
            raise ImportAdocSpanInvalidValueException(
                "text_begin_char: text_end_char", (text_begin_char, text_end_char)
            )
        if not isinstance(text_begin_token, int) or text_begin_token < 0:
            raise ImportAdocSpanInvalidValueException(
                "text_begin_token", text_begin_token
            )
        if not isinstance(text_end_token, int) or text_end_token <= 0:
            raise ImportAdocSpanInvalidValueException("text_end_token", text_end_token)
        if not text_end_token > text_begin_token:
            raise ImportAdocSpanInvalidValueException(
                "text_begin_token: text_end_token", (text_begin_token, text_end_token)
            )

    def _import_all_project_metadata(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        proj_id = imj_parameters.proj_id
        user_id = imj_parameters.user_id
        try:
            archfile_filename = imj_parameters.filename
            path_to_project_metadata_file = self.repo._get_dst_path_for_temp_file(
                archfile_filename
            )
            project_details = json.load(open(path_to_project_metadata_file, "r"))
            self.__update_project_details(
                db=db,
                project_details=project_details,
                project_id=proj_id,
                user_id=user_id,
            )
        except Exception as e:
            crud_project.remove(db=db, id=proj_id)
            raise e

    def _import_sdoc_metadatas_to_project(
        self,
        db: Session,
        imj_parameters: ImportJobParameters,
    ) -> None:
        proj_id = imj_parameters.proj_id
        filename = imj_parameters.filename
        path_to_file = self.repo._get_dst_path_for_temp_file(filename)
        df = pd.read_csv(path_to_file)
        for _, row in df.iterrows():
            self.__import_project_metadata(row, db=db, proj_id=proj_id)

    def __read_import_project_files(self, temp_proj_path: Path) -> Tuple[Dict, Dict]:
        """
        expected_files = {
            "project_details": project_details.json
            "project_metadatas": project_metadatas.csv
            "codes": project_codes.csv
            "sdoc_links": project_sdoc_links.csv
            "tags": project_tags.csv
        }
        sdocs = {
            "sdoc_filename":{
                "sdoc": filename.html,
                "sdoc_metadatas": filename.json
                "sdoc_annotations": filename.csv
            }
        }


        """

        expected_files: Dict = dict()
        sdocs: Dict = dict()

        file_names = [
            f for f in listdir(temp_proj_path) if isfile(join(temp_proj_path, f))
        ]
        for file_name in file_names:
            file_type, is_non_sdoc_filetype = self.__get_filetype_from_name(file_name)

            if file_type != "logbook":
                file_path = Path(join(temp_proj_path, file_name))
                if is_non_sdoc_filetype:
                    # if its one of the "one of files"
                    expected_files[file_type] = file_path
                else:
                    sdoc_name = file_name.split(".")[
                        0
                    ]  # This is brittle to filenames with dots in their names.
                    if sdoc_name not in sdocs:
                        sdocs[sdoc_name] = dict()
                    sdocs[sdoc_name][file_type] = file_path

        # post-conditions Everything is filled
        for file_type, file_value in expected_files.items():
            if not file_value:
                raise ImportFileMissingException(file_type)
            for sdoc_file_name, sdoc_data in sdocs.items():
                for sdoc_file_type in SDOC_FILE_TYPES:
                    if sdoc_file_type not in sdoc_data:
                        raise ImportSDocFileMissingException(
                            sdoc_file_name, sdoc_file_type
                        )

        return expected_files, sdocs

    def __get_filetype_from_name(self, filename) -> Tuple[str, bool]:
        for regex in FILETYPE_REGEX:
            match = re.search(regex[0], filename)
            if match:
                return regex[1], regex[2]
        return "sdoc", False
