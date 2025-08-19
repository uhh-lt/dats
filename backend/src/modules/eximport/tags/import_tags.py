import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from modules.eximport.tags.tag_export_schema import TagExportCollection, TagExportSchema
from utils.color_utils import get_next_color


class ImportTagsError(Exception):
    """Exception raised when tag import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing tags: {errors}")
        self.errors = errors


class TagImporter:
    """
    Handles import of tag hierarchies from pandas DataFrame into the database.
    Validates input data and ensures proper parent-child relationships.
    """

    def __init__(self, db: Session, project_id: int):
        self.db = db
        self.project_id = project_id
        self.tag_id_mapping: dict[str, int] = {}

    def import_tags(self, df: pd.DataFrame, validate_only: bool) -> dict[str, int]:
        """
        Import tags from DataFrame into the project.

        Args:
            df: DataFrame with tag data matching the TagExportSchema
            validate_only: If True, only validate the data without importing

        Returns:
            Dict mapping tag_names to their IDs in the database
        """
        # Validate input data using our schema
        try:
            tag_collection = TagExportCollection.from_dataframe(df)
        except ValueError as e:
            logger.error(f"Failed to load tag import data: {e}")
            raise ImportTagsError(errors=[f"Invalid data format for tags: {e}"])

        try:
            # Process tags in hierarchical order (breadth-first)
            sorted_layers = self._sort_tags_by_hierarchy(tag_collection.tags)
            logger.info(
                f"Importing {len(tag_collection.tags)} tags in {len(sorted_layers)} hierarchical layers..."
            )

            # Process each layer in order
            create_dtos: list[TagCreate] = []
            for layer in sorted_layers:
                for tag in layer:
                    create_dto = self._prepare_create_if_not_exists(tag)
                    if create_dto:
                        create_dtos.append(create_dto)

            # If validate_only is True, we can stop here
            if validate_only:
                logger.info("Validation completed successfully. No tags were imported.")
                return {}

            # Everything is valid, we can create the tags
            created_tags = crud_tag.create_multi(
                db=self.db,
                create_dtos=create_dtos,
            )
            for tag in created_tags:
                logger.info(f"Created tag {tag.name} with ID {tag.id}")
                self.tag_id_mapping[tag.name] = tag.id

        except ValueError as e:
            logger.error(f"Failed to import tags: {e}")
            raise ImportTagsError(errors=[str(e)])

        logger.info(f"Successfully imported {len(self.tag_id_mapping)} tags")
        return self.tag_id_mapping

    def _sort_tags_by_hierarchy(
        self, tags: list[TagExportSchema]
    ) -> list[list[TagExportSchema]]:
        """
        Sort tags by hierarchy using breadth-first search.
        Returns:
            List of layers, where each layer is a list of tags at the same depth in the hierarchy
        """
        # Copy tags to avoid modifying the input
        remaining_tags = tags.copy()
        layers: list[list[TagExportSchema]] = []

        # Process root tags first (those without parent)
        root_tags = [t for t in remaining_tags if t.parent_tag_name is None]
        if not root_tags:
            raise ValueError(
                "No root tags found in import data. At least one tag must have no parent."
            )

        layers.append(root_tags)
        processed_tag_names = {t.tag_name for t in root_tags}
        remaining_tags = [
            t for t in remaining_tags if t.tag_name not in processed_tag_names
        ]

        # Process remaining layers
        while remaining_tags:
            # Find tags whose parent is in the last layer
            parent_names = {t.tag_name for t in layers[-1]}
            next_layer = [
                t for t in remaining_tags if t.parent_tag_name in parent_names
            ]

            if not next_layer:
                # If we have remaining tags but can't process more, there's a cycle or invalid reference
                problematic_tags = ", ".join(
                    [
                        f"{t.tag_name} (parent: {t.parent_tag_name})"
                        for t in remaining_tags
                    ]
                )
                raise ValueError(
                    f"Could not process all tags. Possible cycle in tag hierarchy: {problematic_tags}"
                )

            layers.append(next_layer)
            processed_tag_names.update(t.tag_name for t in next_layer)
            remaining_tags = [
                t for t in remaining_tags if t.tag_name not in processed_tag_names
            ]

        return layers

    def _prepare_create_if_not_exists(self, tag: TagExportSchema) -> TagCreate | None:
        """
        Prepare the creation of a tag if it doesn't exist.
        Args:
            tag: Tag schema to create or validate
        """
        parent_id = (
            self.tag_id_mapping.get(tag.parent_tag_name)
            if tag.parent_tag_name
            else None
        )

        # Check if tag already exists
        existing_tag = crud_tag.read_by_name_and_project(
            db=self.db, name=tag.tag_name, project_id=self.project_id
        )

        if existing_tag:
            # Validate that existing tag matches imported tag
            self._validate_existing_tag(existing_tag, tag, parent_id)
            self.tag_id_mapping[tag.tag_name] = existing_tag.id
            return None
        else:
            return TagCreate(
                name=tag.tag_name,
                description=tag.description,
                parent_id=parent_id,
                project_id=self.project_id,
                color=tag.color if tag.color else get_next_color(),
            )

    def _validate_existing_tag(
        self,
        existing_tag,
        imported_tag: TagExportSchema,
        expected_parent_id: int | None,
    ) -> None:
        """
        Validate that an existing tag matches the imported tag.
        Raises:
            ValueError: If validation fails
        """
        if existing_tag.parent_id != expected_parent_id:
            raise ValueError(
                f"Tag '{imported_tag.tag_name}' already exists with different parent ID. "
                f"Expected parent ID: {expected_parent_id}, actual: {existing_tag.parent_id}"
            )
        # Note: We're not validating description differences, similar to CodeImporter


def import_tags_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
    validate_only: bool = False,
) -> dict[str, int]:
    """
    Import tags from a DataFrame into a project.
    Args:
        db: Database session
        df: DataFrame with tag data
        project_id: ID of the project to import tags into
        validate_only: If True, only validate the data without importing

    Returns:
        Dictionary mapping tag names to their IDs in the database
    """
    importer = TagImporter(db, project_id)
    return importer.import_tags(df, validate_only=validate_only)
