from typing import TYPE_CHECKING

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from app.core.data.orm.user import UserORM
    from app.core.data.orm.project import ProjectORM


class AnalysisTableORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    title = Column(String, nullable=False, index=False)
    content = Column(String, nullable=False, index=False)
    table_type = Column(String, nullable=False, index=False)

    project_id = Column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: "ProjectORM" = relationship("ProjectORM", back_populates="analysis_tables")

    user_id = Column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: "UserORM" = relationship("UserORM", back_populates="analysis_tables")
