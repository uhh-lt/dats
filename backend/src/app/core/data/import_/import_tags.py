from typing import (
    Dict,
    Optional,
)

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.dto.document_tag import DocumentTagCreate


def __check_tag_duplicates(df: pd.DataFrame) -> None:
    if df["tag_name"].duplicated().any():
        raise ValueError(
            f"Some tag_names are duplicated: {df['tag_name'][df['tag_name'].duplicated()].unique()}"
        )


def __check_tag_parents_defined(df: pd.DataFrame) -> None:
    if (
        not df[df["parent_tag_name"].notna()]["parent_tag_name"]
        .isin(df["tag_name"])
        .all()
    ):
        raise ValueError("Not all parent tag ids are present in the tag ids.")


def __check_tag_missing_values(df: pd.DataFrame) -> None:
    if df["tag_name"].isna().any():
        raise ValueError(f"Missing tag_name on rows: {df[df['tag_name'].isna()]}")


def __tag_breadth_search_sort(df: pd.DataFrame) -> list[pd.DataFrame]:
    layers: list[pd.DataFrame] = []
    mask = df["parent_tag_name"].isna()
    while mask.any() and len(df) > 0:
        layers.append(df[mask])
        df = df[~mask]
        mask = df["parent_tag_name"].isin(layers[-1]["tag_name"])
    return layers


def create_tag_if_not_exists(
    db: Session,
    proj_id: int,
    tag_id_mapping: dict[str, int],
    tag_name: str,
    description: str,
    color: Optional[str],
    parent_tag_name: Optional[str],
) -> None:
    # either set parent_tag_name on python None or on the mapped new id of the tag
    if parent_tag_name is None:
        parent_tag_id = None
    else:
        parent_tag_id = tag_id_mapping[parent_tag_name]

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
        create_tag = DocumentTagCreate(
            name=tag_name,
            description=description,
            parent_id=parent_tag_id,
            project_id=proj_id,
            **{"color": color} if color is not None else {},
        )
        tag = crud_document_tag.create(db=db, create_dto=create_tag)
    tag_id_mapping[tag_name] = tag.id
    logger.info(f"import tag {tag.as_dict()}")


def import_tags_to_proj(db: Session, df: pd.DataFrame, proj_id: int) -> Dict[str, int]:
    tag_id_mapping: Dict[str, int] = dict()
    df = df.fillna(  # TODO: This field should not be optional and should be empty string on default...
        value={
            "description": "",
        }
    )
    __check_tag_missing_values(df)
    __check_tag_parents_defined(df)
    __check_tag_duplicates(df)

    sorted_dfs = __tag_breadth_search_sort(
        df
    )  # split the df into layers of tags starting with root tags.

    logger.info(f"Importing Tags sorted by depth {sorted_dfs} ...")
    for layer in sorted_dfs:
        for _, row in layer.iterrows():
            create_tag_if_not_exists(
                db=db,
                proj_id=proj_id,
                tag_id_mapping=tag_id_mapping,
                tag_name=str(row["tag_name"]),
                description=str(row["description"]),
                color=str(row["color"]) if isinstance(row["color"], str) else None,
                parent_tag_name=str(row["parent_tag_name"])
                if isinstance(row["parent_tag_name"], str)
                else None,
            )

            logger.info(f"Generated tag id mapping {tag_id_mapping}")
    return tag_id_mapping
