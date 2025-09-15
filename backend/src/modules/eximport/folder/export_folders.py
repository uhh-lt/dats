from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.doc.folder_dto import FolderType
from core.doc.folder_orm import FolderORM
from core.project.project_crud import crud_project
from modules.eximport.export_exceptions import NoDataToExportError
from modules.eximport.folder.folder_export_schema import (
    FolderExportCollection,
    FolderExportSchema,
)
from repos.filesystem_repo import FilesystemRepo


def export_all_folders(
    db: Session,
    fsr: FilesystemRepo,
    project_id: int,
) -> Path:
    folders = crud_project.read(db=db, id=project_id).folders
    folders = [f for f in folders if f.folder_type == FolderType.NORMAL]
    return __export_folders(
        db=db,
        fsr=fsr,
        fn=f"project_{project_id}_all_folders",
        folders=folders,
    )


def __export_folders(
    db: Session,
    fsr: FilesystemRepo,
    fn: str,
    folders: list[FolderORM],
) -> Path:
    if len(folders) == 0:
        raise NoDataToExportError("No folders to export.")

    export_data = __generate_export_df_for_folders(folders=folders)
    return fsr.write_df_to_temp_file(
        df=export_data,
        fn=fn,
    )


def __generate_export_df_for_folders(folders: list[FolderORM]) -> pd.DataFrame:
    logger.info(f"Exporting {len(folders)} folders ...")

    folder_export_items = []

    for folder in folders:
        folder_export_items.append(
            FolderExportSchema(
                folder_name=folder.name,
                parent_folder_name=folder.parent.name if folder.parent else None,
            )
        )

    collection = FolderExportCollection(folders=folder_export_items)
    return collection.to_dataframe()
