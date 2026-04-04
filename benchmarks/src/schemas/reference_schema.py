from typing import Any

from pydantic import BaseModel


class BaseReferenceSchema(BaseModel):
    @classmethod
    def create_from_reference(cls, reference: Any):
        """Parse a reference payload into a strongly typed reference object."""

        if isinstance(reference, str):
            return cls.model_validate_json(reference)

        if isinstance(reference, BaseModel):
            return cls.model_validate(reference.model_dump())

        if isinstance(reference, dict):
            return cls.model_validate(reference)

        raise TypeError(
            f"Reference must be a JSON string, dict, or pydantic model for {cls.__name__} parsing."
        )
