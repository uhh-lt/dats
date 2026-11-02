from datetime import datetime

import pandas as pd
from pydantic import BaseModel, Field, TypeAdapter, field_validator

from core.prompt.prompt_enum import TaskType
from modules.agreement.agreement_dto import AgreementScore
from modules.agreement.agreement_enum import AgreementScoring
from modules.llm_assistant.llm_assistant_job_dto import ANNOTATING_TASK_TYPES
from systems.job_system.job_system_enum import JobStatus

# --- REFERENCES ---
# Experiments and runs reference project data by id. Ids differ between projects,
# so the export references documents by filename, codes by name, users by email
# and prompt versions by prompt name and version number. A reference is None if
# the referenced object was deleted. Lists of references are JSON strings.

REFERENCES = TypeAdapter(list[str | None])


class ExperimentRunCodeScoreForExport(AgreementScore):
    code_name: str | None = Field(description="Name of the code the scores refer to")


class ExperimentRunScoresForExport(BaseModel):
    """The stored agreement of a run with one scoring, with its codes by name."""

    scoring: AgreementScoring = Field(
        description="How the annotations were split into scoring units"
    )
    num_units: int = Field(
        description="Number of units that carry a code on at least one side"
    )
    total: AgreementScore = Field(description="Scores over all codes")
    code_scores: list[ExperimentRunCodeScoreForExport] = Field(
        description="Scores per code, in the order of the experiment's codes"
    )


SCORES = TypeAdapter(list[ExperimentRunScoresForExport])


def _validate_references(v: str) -> str:
    REFERENCES.validate_json(v)
    return v


# --- ROWS ---
# One CSV file with one row per experiment and one per run. Run rows have a
# run_name, experiment rows have none; each kind leaves the columns of the other
# empty.


class ExperimentExportSchema(BaseModel):
    """Schema definition for experiment export/import operations: the row of an
    experiment."""

    experiment_name: str = Field(description="Name of the experiment")
    task_type: TaskType = Field(description="Task of the experiment")
    sdoc_filenames: str = Field(
        description="JSON list of the filenames of the experiment's documents"
    )
    code_names: str = Field(
        description="JSON list of the names of the experiment's codes"
    )
    gold_user_email: str | None = Field(
        description="Email of the gold annotator, None if there is none",
        default=None,
    )

    @field_validator("experiment_name")
    @classmethod
    def validate_experiment_name(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("experiment_name cannot be empty")
        return v

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, v: TaskType) -> TaskType:
        if v not in ANNOTATING_TASK_TYPES:
            raise ValueError("An experiment is a span or sentence annotation task")
        return v

    @field_validator("sdoc_filenames", "code_names")
    @classmethod
    def validate_references_json(cls, v: str) -> str:
        return _validate_references(v)


class ExperimentRunExportSchema(BaseModel):
    """Schema definition for experiment export/import operations: the row of a
    run, with the name of its experiment."""

    experiment_name: str = Field(description="Name of the experiment of the run")
    run_name: str = Field(description="Name of the run, unique per experiment")
    prompt_name: str | None = Field(
        description="Name of the prompt of the run's prompt version"
    )
    prompt_version: int | None = Field(
        description="Number of the run's prompt version within its prompt"
    )
    model: str = Field(description="Large Language Model of the run")
    sdoc_filenames: str = Field(
        description="JSON list of the filenames of the documents the run ran on"
    )
    virtual_user_email: str | None = Field(
        description="Email of the virtual user the run wrote its annotations into"
    )
    user_email: str | None = Field(
        description="Email of the user who started the run", default=None
    )
    status: JobStatus = Field(description="State of the run")
    started: datetime | None = Field(
        description="When the job of the run started", default=None
    )
    finished: datetime | None = Field(
        description="When the job of the run ended", default=None
    )
    scores: str = Field(
        description="JSON list of the stored ExperimentRunScoresForExport"
    )
    scores_computed: datetime | None = Field(
        description="When the stored scores were computed", default=None
    )

    @field_validator("experiment_name", "run_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("experiment_name and run_name cannot be empty")
        return v

    @field_validator("sdoc_filenames")
    @classmethod
    def validate_references_json(cls, v: str) -> str:
        return _validate_references(v)

    @field_validator("scores")
    @classmethod
    def validate_scores_json(cls, v: str) -> str:
        SCORES.validate_json(v)
        return v


class ExperimentExportCollection(BaseModel):
    """Collection of experiments and runs for export/import operations."""

    experiments: list[ExperimentExportSchema]
    runs: list[ExperimentRunExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "ExperimentExportCollection":
        """Convert a DataFrame to an ExperimentExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.astype(object).where(df.notna(), None)
        records = df_cleaned.to_dict("records")
        return cls(
            experiments=[
                ExperimentExportSchema(**record)  # type: ignore
                for record in records
                if record.get("run_name") is None
            ],
            runs=[
                ExperimentRunExportSchema(**record)  # type: ignore
                for record in records
                if record.get("run_name") is not None
            ],
        )

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the ExperimentExportCollection to a DataFrame with the columns
        of both row kinds."""
        records = [
            row.model_dump(mode="json") for row in [*self.experiments, *self.runs]
        ]
        columns = list(
            dict.fromkeys(
                [
                    *ExperimentExportSchema.model_fields,
                    *ExperimentRunExportSchema.model_fields,
                ]
            )
        )
        return pd.DataFrame(records, columns=columns)
