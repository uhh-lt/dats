from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.prompt.prompt_enum import TaskType
from repos.db.orm_base import ORMBase
from systems.job_system.job_system_enum import JobStatus

if TYPE_CHECKING:
    from core.project.project_orm import ProjectORM


class ExperimentORM(ORMBase):
    """Fixed documents, codes, task and gold annotator, on which runs are compared."""

    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # span or sentence annotation
    task_type: Mapped[TaskType] = mapped_column(String, nullable=False, index=False)
    # the documents and codes are fixed once the experiment has a run
    sdoc_ids: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    code_ids: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="experiments"
    )

    # the annotator whose annotations are the gold standard (a human or a virtual user);
    # NULL once the gold annotator is deleted: the experiment keeps its runs and their
    # stored scores, but cannot start or score runs anymore
    gold_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="SET NULL"),
        index=True,
    )

    # one to many
    runs: Mapped[list["ExperimentRunORM"]] = relationship(
        "ExperimentRunORM",
        back_populates="experiment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ExperimentRunORM.id",
        foreign_keys="ExperimentRunORM.experiment_id",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_experiment_name_unique_per_project",
        ),
        PrimaryKeyConstraint("project_id", "id", name="experiment_pkey"),
    )


class ExperimentRunORM(ORMBase):
    """A prompt version and a model, executed on the documents of an experiment.

    The configuration (prompt version, model, documents) never changes; only the
    state of the job and the stored scores do.
    """

    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    # unique per experiment; the virtual user of the run is named <experiment>-<run>
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    model: Mapped[str] = mapped_column(String, nullable=False, index=False)
    # the documents the run ran on, so that its log is self-contained
    sdoc_ids: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, index=False
    )
    # the state of the job of the run, kept when the job expires
    status: Mapped[JobStatus] = mapped_column(String, nullable=False, index=False)
    job_id: Mapped[str | None] = mapped_column(String, index=False)
    started: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=False
    )
    finished: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=False
    )
    # list[ExperimentRunScores]
    scores: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB(none_as_null=True),
        server_default=text("'[]'::jsonb"),
        nullable=False,
        index=False,
    )
    scores_computed: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=False
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    experiment_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    experiment: Mapped["ExperimentORM"] = relationship(
        "ExperimentORM", back_populates="runs", foreign_keys=[experiment_id]
    )

    prompt_version_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # the virtual user the run writes its annotations into. ExperimentService deletes it
    # after the run; NO ACTION refuses to delete it before. Deleting the project defers
    # the check to the commit (crud_project): its cascades delete the users and the
    # experiments in any order, so the runs may still exist when the users are deleted
    virtual_user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "user.id",
            ondelete="NO ACTION",
            deferrable=True,
            initially="IMMEDIATE",
            name="experimentrun_virtual_user_id_fkey",
        ),
        nullable=False,
        index=True,
    )

    # the user who started the run (kept as NULL when the user is deleted)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="SET NULL"),
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "experiment_id",
            "name",
            name="UC_experiment_run_name_unique_per_experiment",
        ),
        PrimaryKeyConstraint("project_id", "id", name="experimentrun_pkey"),
        ForeignKeyConstraint(
            ["project_id", "experiment_id"],
            ["experiment.project_id", "experiment.id"],
            ondelete="CASCADE",
            name="FK_experimentrun_experiment_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "prompt_version_id"],
            ["promptversion.project_id", "promptversion.id"],
            ondelete="CASCADE",
            name="FK_experimentrun_prompt_version_id",
        ),
    )
