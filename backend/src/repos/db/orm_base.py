from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase, declared_attr


class ORMBase(DeclarativeBase):
    id: Any
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return cls.__name__.replace("ORM", "").lower()

    def as_dict(self, exclude: set = set()):
        return {
            c.key: getattr(self, c.key)
            for c in inspect(self).mapper.column_attrs
            if c.key not in exclude
        }

    def get_project_id(self) -> int:
        """
        Returns the project ID associated with this ORM object.
        """
        raise NotImplementedError(f"Object has no project_id: {type(self)}")

    def get_user_id(self) -> int:
        user_id = getattr(self, "user_id", None)
        if user_id is not None:
            return user_id

        raise NotImplementedError(f"Object has no user_id: {type(self)}")
