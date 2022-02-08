from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase


class FilterORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)

    # one to one
    object_handle = relationship("ObjectHandleORM",
                                 uselist=False,
                                 back_populates="filter",
                                 cascade="all, delete",
                                 passive_deletes=True)
