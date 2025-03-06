from typing import Dict, Optional

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.dto.code import CodeCreate


def __check_code_duplicates(df: pd.DataFrame) -> None:
    if df["code_name"].duplicated().any():
        raise ValueError(
            f"Some code_names are duplicated: {df['code_name'][df['code_name'].duplicated()].unique()}"
        )


def __check_code_parents_defined(df: pd.DataFrame) -> None:
    if (
        not df[df["parent_code_name"].notna()]["parent_code_name"]
        .isin(df["code_name"])
        .all()
    ):
        raise ValueError("Not all parent code ids are present in the code ids.")


def __check_code_missing_values(df: pd.DataFrame) -> None:
    if df["code_name"].isna().any():
        raise ValueError(f"Missing code_name on rows: {df[df['code_name'].isna()]}")


def __code_breadth_search_sort(df: pd.DataFrame) -> list[pd.DataFrame]:
    layers: list[pd.DataFrame] = []
    mask = df["parent_code_name"].isna()
    while mask.any() and len(df) > 0:
        layers.append(df[mask])
        df = df[~mask]
        mask = df["parent_code_name"].isin(layers[-1]["code_name"])
    return layers


def create_code_if_not_exists(
    db: Session,
    proj_id: int,
    code_id_mapping: dict[str, int],
    description: str,
    color: Optional[str],
    code_name: str,
    parent_code_name: Optional[str] = None,
) -> None:
    parent_code_id = code_id_mapping[parent_code_name] if parent_code_name else None
    code_read = crud_code.read_by_name_and_project(
        db=db, code_name=code_name, proj_id=proj_id
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
        #         f"Trying to map imported code on already existing code, and expected color to be {code_read.color}, but got {color} instead."
        #     ) TODO: To discuss
        code = code_read
    else:
        create_code = CodeCreate(
            name=code_name,
            description=description,
            parent_id=parent_code_id,
            project_id=proj_id,
            is_system=False,
            enabled=True,
            **({"color": color} if color is not None else {}),
        )
        code = crud_code.create(db=db, create_dto=create_code)
    code_id_mapping[code_name] = code.id
    logger.info(f"create code {code.as_dict()}")


def import_codes_to_proj(
    db: Session,
    df: pd.DataFrame,
    project_id: int,
) -> Dict[str, int]:
    code_id_mapping: dict[str, int] = dict()
    df = df.fillna(  # TODO: This field should not be optional and should be empty string on default...
        value={
            "description": "",
        }
    )

    __check_code_parents_defined(df)
    __check_code_duplicates(df)

    sorted_dfs = __code_breadth_search_sort(
        df
    )  # split the df into layers of codes starting with root codes.

    logger.info(f"Importing codes sorted by depth {sorted_dfs} ...")
    for layer in sorted_dfs:
        for _, row in layer.iterrows():
            create_code_if_not_exists(
                db,
                project_id,
                code_id_mapping=code_id_mapping,
                code_name=str(row["code_name"]),
                description=str(row["description"]),
                color=str(row["color"]) if isinstance(row["color"], str) else None,
                parent_code_name=str(row["parent_code_name"])
                if isinstance(row["parent_code_name"], str)
                else None,
            )
    logger.info(f"Generated code id mapping {code_id_mapping}")
    return code_id_mapping
