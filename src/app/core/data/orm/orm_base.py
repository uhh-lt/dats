from typing import Any, Optional, Set

from sqlalchemy import inspect
from sqlalchemy.ext.declarative import as_declarative, declared_attr


@as_declarative()
class ORMBase:
    id: Any
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.replace("ORM", "").lower()

    def as_dict(self, exclude: Optional[Set] = None):
        if not exclude:
            exclude = {}
        return {c.key: getattr(self, c.key)
                for c in inspect(self).mapper.column_attrs if c.key not in exclude}
