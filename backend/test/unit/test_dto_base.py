import pytest
from pydantic import BaseModel, Field, ValidationError

from repos.db.dto_base import UpdateDTOBase


class FooUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Foo", default=None)
    parent_id: int | None = Field(description="Parent of the Foo", default=None)


class FooUpdateBulk(FooUpdate):
    foo_id: int = Field(description="ID of the Foo to update")


class FooStatusUpdate(BaseModel, UpdateDTOBase):
    is_reviewed: bool = Field(description="Whether the Foo was reviewed")


# ===========================================================================
# UPDATE DTO BASE TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "build",
    [
        # no field at all
        pytest.param(lambda: FooUpdate(), id="constructor"),
        # empty PATCH body
        pytest.param(lambda: FooUpdate.model_validate({}), id="empty-json"),
        # the always-set id of a bulk update does not count as an update
        pytest.param(lambda: FooUpdateBulk(foo_id=1), id="bulk-id-only"),
    ],
)
def test_update_dto_base_rejects_update_without_set_field(build) -> None:
    """An Update DTO that sets none of its optional fields is invalid."""
    with pytest.raises(ValidationError, match="At least one field to update"):
        build()


@pytest.mark.parametrize(
    "build",
    [
        # a regular value
        pytest.param(lambda: FooUpdate(name="new"), id="value"),
        # an explicit null is an update (e.g. move a folder to the root)
        pytest.param(lambda: FooUpdate(parent_id=None), id="explicit-null"),
        # explicit null in a JSON body
        pytest.param(
            lambda: FooUpdate.model_validate({"parent_id": None}), id="null-json"
        ),
        # bulk update with id and one field
        pytest.param(lambda: FooUpdateBulk(foo_id=1, name="new"), id="bulk"),
        # an Update DTO without optional fields is always valid
        pytest.param(lambda: FooStatusUpdate(is_reviewed=True), id="only-required"),
    ],
)
def test_update_dto_base_accepts_update_with_set_field(build) -> None:
    """Setting at least one optional field (even to None) is a valid update."""
    assert build().model_fields_set


def test_update_dto_base_does_not_count_unset_defaults() -> None:
    """Only explicitly set fields count: defaults do not make an update non-empty."""
    update = FooUpdate(name="new")
    assert update.model_fields_set == {"name"}
    assert update.model_dump(exclude_unset=True) == {"name": "new"}
