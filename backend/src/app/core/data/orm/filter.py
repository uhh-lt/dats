from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.object_handle import ObjectHandleORM


# TODO Flo
class FilterORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="filter",
                                                    cascade="all, delete",
                                                    passive_deletes=True)
