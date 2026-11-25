from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.classifier.classifier_enum import ClassifierModel
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.code.code_orm import CodeORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM


class ClassifierORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    base_model: Mapped[str] = mapped_column(String, nullable=False, index=True)
    type: Mapped[ClassifierModel] = mapped_column(String, nullable=False, index=True)
    labelid2classid: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False)

    # TRAINING
    train_params: Mapped[dict] = mapped_column(JSON, nullable=False)
    train_loss: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    train_data_stats: Mapped[list[dict]] = mapped_column(JSON, nullable=False)

    # one to many
    evaluations: Mapped[list["ClassifierEvaluationORM"]] = relationship(
        "ClassifierEvaluationORM",
        back_populates="classifier",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="ClassifierEvaluationORM.classifier_id",
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

    # many to many
    codes: Mapped[list["CodeORM"]] = relationship(
        "CodeORM",
        secondary="ClassifierCodeLinkTable".lower(),
        viewonly=True,
    )
    tags: Mapped[list["TagORM"]] = relationship(
        "TagORM",
        secondary="ClassifierTagLinkTable".lower(),
        viewonly=True,
    )

    __table_args__ = (
        UniqueConstraint("project_id", "name", name="UC_unique_name_in_project"),
        UniqueConstraint("project_id", "id", name="UC_classifier_project_id_id"),
    )

    @property
    def class_ids(self) -> list[int]:
        if self.type == ClassifierModel.DOCUMENT:
            return [tag.id for tag in self.tags]
        return [code.id for code in self.codes]

    def get_project_id(self) -> int:
        return self.project_id


class ClassifierEvaluationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    f1: Mapped[float] = mapped_column(Float, nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    eval_data_stats: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False
    )  # todo: needs to be validated in DTO
    class_metrics: Mapped[list[dict]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )
    confusion_matrix: Mapped[list[list[int]]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )
    confusion_matrix_class_ids: Mapped[list[int]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    classifier_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    classifier: Mapped["ClassifierORM"] = relationship(
        "ClassifierORM",
        back_populates="evaluations",
        foreign_keys=[classifier_id],
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "id", name="UC_classifierevaluation_project_id_id"
        ),
        ForeignKeyConstraint(
            ["project_id", "classifier_id"],
            ["classifier.project_id", "classifier.id"],
            ondelete="CASCADE",
            name="FK_classifierevaluation_classifier_id",
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id


class ClassifierCodeLinkTable(ORMBase):
    classifier_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "classifier_id"],
            ["classifier.project_id", "classifier.id"],
            ondelete="CASCADE",
            name="FK_classifiercodelinktable_classifier_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "code_id"],
            ["code.project_id", "code.id"],
            ondelete="CASCADE",
            name="FK_classifiercodelinktable_code_id",
        ),
    )


class ClassifierTagLinkTable(ORMBase):
    classifier_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tag_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "classifier_id"],
            ["classifier.project_id", "classifier.id"],
            ondelete="CASCADE",
            name="FK_classifiertaglinktable_classifier_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "tag_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_classifiertaglinktable_tag_id",
        ),
    )
