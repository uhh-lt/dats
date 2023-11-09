from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column


class VersionORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=0)
