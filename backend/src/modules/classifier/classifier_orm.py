from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.classifier.classifier_dto import ClassifierModel
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.code.code_orm import CodeORM
    from core.project.project_orm import ProjectORM


class ClassifierORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    type: Mapped[ClassifierModel] = mapped_column(String, nullable=False, index=True)
    path: Mapped[str] = mapped_column(String, nullable=False)
    codes: Mapped[list["CodeORM"]] = relationship(
        "CodeORM", secondary="ClassifierCodeLinkTable".lower()
    )

    # TRAINING
    batch_size: Mapped[int] = mapped_column(Integer, nullable=False)
    epochs: Mapped[int] = mapped_column(Integer, nullable=False)
    train_loss: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False
    )  # todo: needs to be validated in DTO
    # one to many
    train_data_stats: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False
    )  # todo: needs to be validated in DTO

    # EVALUATION
    # one to many
    evaluations: Mapped[list["ClassifierEvaluationORM"]] = relationship(
        "ClassifierEvaluationORM",
        back_populates="classifier",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM",
        back_populates="classifiers",
    )

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="UC_unique_name_in_project"),
    )

    @property
    def code_ids(self) -> list[int]:
        return [code.id for code in self.codes]

    def get_project_id(self) -> int:
        return self.project_id


class ClassifierEvaluationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )

    f1: Mapped[float] = mapped_column(Float, nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    eval_loss: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False
    )  # todo: needs to be validated in DTO
    eval_data_stats: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False
    )  # todo: needs to be validated in DTO

    # many to one
    classifier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("classifier.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    classifier: Mapped["ClassifierORM"] = relationship(
        "ClassifierORM",
        back_populates="evaluations",
    )


class ClassifierCodeLinkTable(ORMBase):
    classifier_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("classifier.id", ondelete="CASCADE"), primary_key=True
    )
    code_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("code.id"), primary_key=True
    )
