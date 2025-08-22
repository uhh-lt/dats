import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from modules.eximport.codes.code_export_schema import (
    CodeExportCollection,
    CodeExportSchema,
)
from utils.color_utils import get_next_color


class ImportCodesError(Exception):
    """Exception raised when code import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing codes: {errors}")
        self.errors = errors


class CodeImporter:
    """
    Handles import of code hierarchies from pandas DataFrame into the database.
    Validates input data and ensures proper parent-child relationships.
    """

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id
        self.code_id_mapping: dict[str, int] = {}

    def import_codes(self, df: pd.DataFrame, validate_only: bool) -> dict[str, int]:
        """
        Import codes from DataFrame into the project.

        Args:
            df: DataFrame with code data matching the CodeExportSchema
            validate_only: If True, only validate the data without importing

        Returns:
            Dict mapping code_names to their IDs in the database
        """
        # Validate input data using our schema
        try:
            code_collection = CodeExportCollection.from_dataframe(df)
        except ValueError as e:
            logger.error(f"Failed to load code import data: {e}")
            raise ImportCodesError(errors=[f"Invalid data format for codes: {e}"])

        try:
            # Process codes in hierarchical order (breadth-first)
            sorted_layers = self._sort_codes_by_hierarchy(code_collection.codes)

            logger.info(
                f"Importing {len(code_collection.codes)} codes in {len(sorted_layers)} hierarchical layers..."
            )

            # Process each layer in order
            create_dtos: list[list[CodeCreate]] = []
            for layer in sorted_layers:
                # 1. construct create dtos per layer
                layer_dtos: list[CodeCreate] = []
                for code in layer:
                    create_dto = self._prepare_create_if_not_exists(code)
                    if create_dto:
                        layer_dtos.append(create_dto)
                    create_dtos.append(layer_dtos)

                # 2. bulk create layer
                if not validate_only:
                    created_codes = crud_code.create_multi(
                        db=self.db,
                        create_dtos=layer_dtos,
                    )
                    for code in created_codes:
                        logger.info(f"Created code {code.name} with ID {code.id}")
                        self.code_id_mapping[code.name] = code.id

            # If validate_only is True, we can stop here
            if validate_only:
                logger.info("Validation successful. No codes were imported.")
                return {}

        except ValueError as e:
            logger.error(f"Failed to import codes: {e}")
            raise ImportCodesError(errors=[str(e)])

        logger.info(f"Successfully imported {len(self.code_id_mapping)} codes")
        return self.code_id_mapping

    def _sort_codes_by_hierarchy(
        self, codes: list[CodeExportSchema]
    ) -> list[list[CodeExportSchema]]:
        """
        Sort codes by hierarchy using breadth-first search.

        Returns:
            List of layers, where each layer is a list of codes at the same depth in the hierarchy
        """
        # Copy codes to avoid modifying the input
        remaining_codes = codes.copy()
        layers: list[list[CodeExportSchema]] = []

        # Process root codes first (those without parent)
        root_codes = [c for c in remaining_codes if c.parent_code_name is None]
        if not root_codes:
            raise ValueError(
                "No root codes found in import data. At least one code must have no parent."
            )

        layers.append(root_codes)
        processed_code_names = {c.code_name for c in root_codes}
        remaining_codes = [
            c for c in remaining_codes if c.code_name not in processed_code_names
        ]

        # Process remaining layers
        while remaining_codes:
            # Find codes whose parent is in the last layer
            parent_names = {c.code_name for c in layers[-1]}
            next_layer = [
                c for c in remaining_codes if c.parent_code_name in parent_names
            ]

            if not next_layer:
                # If we have remaining codes but can't process more, there's a cycle or invalid reference
                problematic_codes = ", ".join(
                    [
                        f"{c.code_name} (parent: {c.parent_code_name})"
                        for c in remaining_codes
                    ]
                )
                raise ValueError(
                    f"Could not process all codes. Possible cycle in code hierarchy: {problematic_codes}"
                )

            layers.append(next_layer)
            processed_code_names.update(c.code_name for c in next_layer)
            remaining_codes = [
                c for c in remaining_codes if c.code_name not in processed_code_names
            ]

        return layers

    def _prepare_create_if_not_exists(
        self, code: CodeExportSchema
    ) -> CodeCreate | None:
        """
        Prepare the creation of a code if it doesn't exist.

        Args:
            code: Code schema to create or validate
        """
        parent_id = (
            self.code_id_mapping.get(code.parent_code_name)
            if code.parent_code_name
            else None
        )

        # Check if code already exists
        existing_code = crud_code.read_by_name_and_project(
            db=self.db, code_name=code.code_name, proj_id=self.project_id
        )

        if existing_code:
            # Validate that existing code matches imported code
            self._validate_existing_code(existing_code, code, parent_id)
            self.code_id_mapping[code.code_name] = existing_code.id
            return None
        else:
            return CodeCreate(
                name=code.code_name,
                description=code.description,
                parent_id=parent_id,
                project_id=self.project_id,
                is_system=False,
                enabled=True,
                color=code.color if code.color else get_next_color(),
            )

    def _validate_existing_code(
        self,
        existing_code,
        imported_code: CodeExportSchema,
        expected_parent_id: int | None,
    ) -> None:
        """
        Validate that an existing code matches the imported code.

        Raises:
            ValueError: If validation fails
        """
        if existing_code.parent_id != expected_parent_id:
            raise ValueError(
                f"Code '{imported_code.code_name}' already exists with different parent ID. "
                f"Expected parent ID: {expected_parent_id}, actual: {existing_code.parent_id}"
            )

        # if existing_code.description != imported_code.description:
        #     raise ValueError(
        #         f"Code '{imported_code.code_name}' already exists with different description. "
        #         f"Expected: '{imported_code.description}', actual: '{existing_code.description}'"
        #     )


def import_codes_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
    validate_only: bool = False,
) -> dict[str, int]:
    """
    Import codes from a DataFrame into a project.

    Args:
        db: Database session
        df: DataFrame with code data
        project_id: ID of the project to import codes into
        validate_only: If True, only validate the data without importing

    Returns:
        Dictionary mapping code names to their IDs in the database
    """
    importer = CodeImporter(db, project_id)
    return importer.import_codes(df, validate_only=validate_only)
