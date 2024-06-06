from typing import List

from pydantic import BaseModel, Field


class MultipleIdsParameter(BaseModel):
    ids: List[int] = Field(
        description="List of multiple integer IDs", min_length=1
    )  # TODO: Docs say min_items -> min_length but ml is only for Strings?
