from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Generic, Literal, TypeVar, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

if TYPE_CHECKING:
    from modules.search_view.search_view_orm import SearchViewORM

from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter
from systems.search_system.grouping import DateGranularity, GroupConfig
from systems.search_system.sorting import Sort

T = TypeVar("T", bound=AbstractColumns)


class SearchEntityType(str, Enum):
    """The searchable entity a saved view is for.

    Each value maps to one column enum (`MemoColumns`, `SpanColumns`, ...). The
    value is stored in `SearchViewORM.entity_type` and used as the discriminator
    for the create/read/update unions below. Sdoc is deliberately omitted: it is
    ElasticSearch-backed and not part of the unified search flow yet.
    """

    MEMO = "memo"
    SPAN_ANNOTATION = "span_annotation"
    SENTENCE_ANNOTATION = "sentence_annotation"
    BBOX_ANNOTATION = "bbox_annotation"


class SearchViewLayout(str, Enum):
    TABLE = "table"
    LIST = "list"
    BOARD = "board"
    GALLERY = "gallery"
    FEED = "feed"


class SearchViewBase(BaseModel, Generic[T]):
    """Shared, entity-agnostic view spec, parameterized over the column enum `T`.

    Concrete per-entity subclasses fix `T` and add a `Literal[...]` `entity_type`
    discriminator.
    """

    # Declared on the base so generic code (CRUD) can read it; each concrete
    # subclass narrows it to a `Literal[...]` discriminator.
    entity_type: SearchEntityType

    project_id: int
    name: str = Field(min_length=1, max_length=255)
    layout: SearchViewLayout
    filters: Filter[T]
    group_by: GroupConfig[T] | None = None
    sorts: list[Sort[T]] = Field(default_factory=list)
    # The entity properties the user chose to render. `None` = the frontend's
    # default selection. Only meaningful for renderable columns; validated per entity.
    selected_properties: list[T] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if name == "":
            raise ValueError("Search view name cannot be blank")
        return name

    @field_validator("sorts", mode="before")
    @classmethod
    def validate_sorts(cls, value: list[Sort[T]] | None) -> list[Sort[T]]:
        # `sorts` is non-nullable; an explicit null is treated as "no sorting".
        return [] if value is None else value

    @model_validator(mode="after")
    def validate_group_by(self) -> "SearchViewBase[T]":
        if self.group_by is None:
            return self
        field = self.group_by.field
        if not field.is_groupable():
            raise ValueError(f"Column {field} does not support grouping")
        if field.is_date_column():
            if self.group_by.date_granularity is None:
                self.group_by.date_granularity = DateGranularity.MONTH
        else:
            self.group_by.date_granularity = None
        return self

    @model_validator(mode="after")
    def validate_board_group(self) -> "SearchViewBase[T]":
        if self.layout == SearchViewLayout.BOARD and self.group_by is None:
            raise ValueError("Board views require a group")
        return self


# --- Per-entity concrete bases (fix the column enum + discriminator) ---


class MemoSearchViewBase(SearchViewBase[MemoColumns]):
    entity_type: Literal[SearchEntityType.MEMO] = SearchEntityType.MEMO


class SpanSearchViewBase(SearchViewBase[SpanColumns]):
    entity_type: Literal[SearchEntityType.SPAN_ANNOTATION] = (
        SearchEntityType.SPAN_ANNOTATION
    )


class SentenceSearchViewBase(SearchViewBase[SentAnnoColumns]):
    entity_type: Literal[SearchEntityType.SENTENCE_ANNOTATION] = (
        SearchEntityType.SENTENCE_ANNOTATION
    )


class BBoxSearchViewBase(SearchViewBase[BBoxColumns]):
    entity_type: Literal[SearchEntityType.BBOX_ANNOTATION] = (
        SearchEntityType.BBOX_ANNOTATION
    )


# --- Create ---


class MemoSearchViewCreate(MemoSearchViewBase):
    pass


class SpanSearchViewCreate(SpanSearchViewBase):
    pass


class SentenceSearchViewCreate(SentenceSearchViewBase):
    pass


class BBoxSearchViewCreate(BBoxSearchViewBase):
    pass


SearchViewCreateUnion = Union[
    MemoSearchViewCreate,
    SpanSearchViewCreate,
    SentenceSearchViewCreate,
    BBoxSearchViewCreate,
]


# --- Read ---


class MemoSearchViewRead(MemoSearchViewBase):
    id: int
    user_id: int
    position: int
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)


class SpanSearchViewRead(SpanSearchViewBase):
    id: int
    user_id: int
    position: int
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)


class SentenceSearchViewRead(SentenceSearchViewBase):
    id: int
    user_id: int
    position: int
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)


class BBoxSearchViewRead(BBoxSearchViewBase):
    id: int
    user_id: int
    position: int
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)


SearchViewReadUnion = Union[
    MemoSearchViewRead,
    SpanSearchViewRead,
    SentenceSearchViewRead,
    BBoxSearchViewRead,
]

# Dispatch from the stored entity_type to the concrete Read DTO, used to validate a
# SearchViewORM into the correctly-typed read model.
_ENTITY_TYPE_TO_READ: dict[
    SearchEntityType,
    type[
        Union[
            MemoSearchViewRead,
            SpanSearchViewRead,
            SentenceSearchViewRead,
            BBoxSearchViewRead,
        ]
    ],
] = {
    SearchEntityType.MEMO: MemoSearchViewRead,
    SearchEntityType.SPAN_ANNOTATION: SpanSearchViewRead,
    SearchEntityType.SENTENCE_ANNOTATION: SentenceSearchViewRead,
    SearchEntityType.BBOX_ANNOTATION: BBoxSearchViewRead,
}


def search_view_read_from_orm(view: "SearchViewORM") -> SearchViewReadUnion:
    """Validate a SearchViewORM into its entity-specific Read DTO.

    Dispatches on the stored `entity_type` so the returned model's
    filters/group_by/sorts are typed against the correct column enum.
    """
    read_cls = _ENTITY_TYPE_TO_READ[SearchEntityType(view.entity_type)]
    return read_cls.model_validate(view)


# --- Update ---


class SearchViewUpdate(BaseModel, Generic[T]):
    """Patch payload. Omitted fields are left unchanged; providing a field replaces it.

    "Omitted" vs "explicitly null" is distinguished via `model_fields_set`:
      - `group_by`: omit to keep, send `null` to clear, send an object to replace.
      - `sorts`:    omit to keep, send `[]` to clear, send a list to replace.

    `entity_type` is intentionally absent: a view's entity is fixed at creation.
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    layout: SearchViewLayout | None = None
    filters: Filter[T] | None = None
    group_by: GroupConfig[T] | None = None
    sorts: list[Sort[T]] | None = None
    selected_properties: list[T] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = value.strip()
        if name == "":
            raise ValueError("Search view name cannot be blank")
        return name


class MemoSearchViewUpdate(SearchViewUpdate[MemoColumns]):
    pass


class SpanSearchViewUpdate(SearchViewUpdate[SpanColumns]):
    pass


class SentenceSearchViewUpdate(SearchViewUpdate[SentAnnoColumns]):
    pass


class BBoxSearchViewUpdate(SearchViewUpdate[BBoxColumns]):
    pass


SearchViewUpdateUnion = Union[
    MemoSearchViewUpdate,
    SpanSearchViewUpdate,
    SentenceSearchViewUpdate,
    BBoxSearchViewUpdate,
]


# --- Reorder ---


class SearchViewReorder(BaseModel):
    view_ids: list[int]

    @field_validator("view_ids")
    @classmethod
    def validate_unique_view_ids(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("Search view order cannot contain duplicate view IDs")
        return value
