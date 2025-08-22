import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from modules.eximport.folder.folder_export_schema import (
    FolderExportCollection,
    FolderExportSchema,
)


class ImportFoldersError(Exception):
    """Exception raised when folder import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing folders: {errors}")
        self.errors = errors


class FolderImporter:
    """
    Handles import of folder hierarchies from pandas DataFrame into the database.
    Validates input data and ensures proper parent-child relationships.
    """

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id
        self.folder_id_mapping: dict[str, int] = {}

    def import_folders(self, df: pd.DataFrame, validate_only: bool) -> dict[str, int]:
        """
        Import folders from DataFrame into the project.

        Args:
            df: DataFrame with folder data matching the FolderExportSchema
            validate_only: If True, only validate the data without importing

        Returns:
            Dict mapping folder_names to their IDs in the database
        """
        # Validate input data using our schema
        try:
            folder_collection = FolderExportCollection.from_dataframe(df)
        except ValueError as e:
            logger.error(f"Failed to load folder import data: {e}")
            raise ImportFoldersError(errors=[f"Invalid data format for folders: {e}"])

        try:
            # Process folders in hierarchical order (breadth-first)
            sorted_layers = self._sort_folders_by_hierarchy(folder_collection.folders)

            logger.info(
                f"Importing {len(folder_collection.folders)} folders in {len(sorted_layers)} hierarchical layers..."
            )

            # Process each layer in order
            create_dtos: list[list[FolderCreate]] = []
            for layer in sorted_layers:
                # 1. construct create dtos per layer
                layer_dtos: list[FolderCreate] = []
                for folder in layer:
                    create_dto = self._prepare_create_if_not_exists(folder)
                    if create_dto:
                        layer_dtos.append(create_dto)
                    create_dtos.append(layer_dtos)

                # 2. bulk create layer
                if not validate_only:
                    created_folders = crud_folder.create_multi(
                        db=self.db,
                        create_dtos=layer_dtos,
                    )
                    for folder in created_folders:
                        logger.info(f"Created folder {folder.name} with ID {folder.id}")
                        self.folder_id_mapping[folder.name] = folder.id

            # If validate_only is True, we can stop here
            if validate_only:
                logger.info("Validation successful. No folders were imported.")
                return {}

        except ValueError as e:
            logger.error(f"Failed to import folders: {e}")
            raise ImportFoldersError(errors=[str(e)])

        logger.info(f"Successfully imported {len(self.folder_id_mapping)} folders")
        return self.folder_id_mapping

    def _sort_folders_by_hierarchy(
        self, folders: list[FolderExportSchema]
    ) -> list[list[FolderExportSchema]]:
        """
        Sort folders by hierarchy using breadth-first search.

        Returns:
            List of layers, where each layer is a list of folders at the same depth in the hierarchy
        """
        # Copy folders to avoid modifying the input
        remaining_folders = folders.copy()
        layers: list[list[FolderExportSchema]] = []

        # Process root folders first (those without parent)
        root_folders = [c for c in remaining_folders if c.parent_folder_name is None]
        if not root_folders:
            raise ValueError(
                "No root folders found in import data. At least one folder must have no parent."
            )

        layers.append(root_folders)
        processed_folder_names = {c.folder_name for c in root_folders}
        remaining_folders = [
            c for c in remaining_folders if c.folder_name not in processed_folder_names
        ]

        # Process remaining layers
        while remaining_folders:
            # Find folders whose parent is in the last layer
            parent_names = {c.folder_name for c in layers[-1]}
            next_layer = [
                c for c in remaining_folders if c.parent_folder_name in parent_names
            ]

            if not next_layer:
                # If we have remaining folders but can't process more, there's a cycle or invalid reference
                problematic_folders = ", ".join(
                    [
                        f"{c.folder_name} (parent: {c.parent_folder_name})"
                        for c in remaining_folders
                    ]
                )
                raise ValueError(
                    f"Could not process all folders. Possible cycle in folder hierarchy: {problematic_folders}"
                )

            layers.append(next_layer)
            processed_folder_names.update(c.folder_name for c in next_layer)
            remaining_folders = [
                c
                for c in remaining_folders
                if c.folder_name not in processed_folder_names
            ]

        return layers

    def _prepare_create_if_not_exists(
        self, folder: FolderExportSchema
    ) -> FolderCreate | None:
        """
        Prepare the creation of a folder if it doesn't exist.

        Args:
            folder: Folder schema to create or validate
        """
        parent_id = (
            self.folder_id_mapping.get(folder.parent_folder_name)
            if folder.parent_folder_name
            else None
        )

        # Check if folder already exists
        existing_folder = crud_folder.read_by_name_and_project(
            db=self.db, folder_name=folder.folder_name, proj_id=self.project_id
        )

        if existing_folder:
            # Validate that existing folder matches imported folder
            self._validate_existing_folder(existing_folder, folder, parent_id)
            self.folder_id_mapping[folder.folder_name] = existing_folder.id
            return None
        else:
            return FolderCreate(
                folder_type=FolderType.NORMAL,
                name=folder.folder_name,
                parent_id=parent_id,
                project_id=self.project_id,
            )

    def _validate_existing_folder(
        self,
        existing_folder,
        imported_folder: FolderExportSchema,
        expected_parent_id: int | None,
    ) -> None:
        """
        Validate that an existing folder matches the imported folder.

        Raises:
            ValueError: If validation fails
        """
        if existing_folder.parent_id != expected_parent_id:
            raise ValueError(
                f"Folder '{imported_folder.folder_name}' already exists with different parent ID. "
                f"Expected parent ID: {expected_parent_id}, actual: {existing_folder.parent_id}"
            )


def import_folders_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
    validate_only: bool = False,
) -> dict[str, int]:
    """
    Import folders from a DataFrame into a project.

    Args:
        db: Database session
        df: DataFrame with folder data
        project_id: ID of the project to import folders into
        validate_only: If True, only validate the data without importing

    Returns:
        Dictionary mapping folder names to their IDs in the database
    """
    importer = FolderImporter(db, project_id)
    return importer.import_folders(df, validate_only=validate_only)
