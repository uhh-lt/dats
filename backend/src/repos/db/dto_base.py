from typing import ClassVar, Self

from pydantic import BaseModel, model_validator


class UpdateDTOBase:
    """Mixin for Update DTOs (`class FooUpdate(BaseModel, UpdateDTOBase)`).

    Rejects an update that sets none of its optional fields, i.e. an empty PATCH
    body. Only explicitly set fields count (`model_fields_set`), so an explicit
    `null` (e.g. `parent_id=None` to move to the root) is a valid update.
    Required fields never count: they identify the entity (`folder_id` of an
    `UpdateBulk` DTO) or are always sent. A DTO without optional fields is
    therefore never rejected.

    Fields listed in `non_nullable_fields` may be omitted but not set to `null`
    (their column is NOT NULL), so an explicit null is rejected at request parsing.
    """

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def check_at_least_one_field_set(self) -> Self:
        assert isinstance(self, BaseModel)
        optional_fields = {
            name
            for name, field in type(self).model_fields.items()
            if not field.is_required()
        }
        if optional_fields and not optional_fields & self.model_fields_set:
            raise ValueError("At least one field to update has to be set")

        null_fields = sorted(
            name
            for name in self.non_nullable_fields & self.model_fields_set
            if getattr(self, name) is None
        )
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(null_fields)}")
        return self
