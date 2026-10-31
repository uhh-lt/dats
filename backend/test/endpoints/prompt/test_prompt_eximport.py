from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy.orm import Session

from core.prompt.prompt_dto import (
    PromptRead,
    SpanPromptExample,
)
from core.prompt.prompt_enum import OutputFormat, PromptLanguage
from core.prompt.prompt_service import PromptService
from core.prompt.prompt_specs import default_prompt_name
from core.user.user_orm import UserORM
from modules.eximport.export_enum import ExportJobType
from modules.eximport.export_job_dto import ExportJobInput
from modules.eximport.export_service import ExportService
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_exceptions import ImportPromptsError
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from modules.eximport.prompts.prompt_export_schema import (
    PromptSelectionsForExport,
    SpanPromptExampleForExport,
)
from repos.filesystem_repo import FilesystemRepo

from .conftest import PromptEximportProjects

CUSTOM_PROMPTS = {
    "Span tagging",
    "Tag selection",
    "Metadata selection",
    "Sentence examples",
}
DEFAULT_TAGS_PROMPT = default_prompt_name(OutputFormat.TAGS, PromptLanguage.EN)

# ===========================================================================
# EXPORT / IMPORT OF PROMPTS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# handlers of the ALL_PROMPTS export job and the PROMPTS import
# job directly.


def _export(db: Session, project_id: int) -> pd.DataFrame:
    """Run the export job of all prompts of a project and read the
    exported CSV as the import does."""
    output = ExportService().handle_export_job(
        db=db,
        payload=ExportJobInput(
            project_id=project_id,
            export_job_type=ExportJobType.ALL_PROMPTS,
            specific_export_job_parameters=None,
        ),
    )
    assert output.results_url is not None
    return read_import_csv(
        FilesystemRepo().get_dst_path_for_temp_file(Path(output.results_url).name)
    )


def _prompts(db: Session, project_id: int) -> dict[str, PromptRead]:
    db.expire_all()
    return {
        prompt.name: prompt
        for prompt in PromptService().read_prompts_by_project(
            db=db, project_id=project_id
        )
    }


def _import(db: Session, df: pd.DataFrame, project_id: int, user_id: int) -> None:
    """Write the data to a CSV file and run the prompt import job on it."""
    path = FilesystemRepo().write_df_to_temp_file(
        df=df, fn=f"project_{project_id}_prompt_import"
    )
    ImportService().handle_import_job(
        db=db,
        payload=ImportJobInput(
            project_id=project_id,
            import_job_type=ImportJobType.PROMPTS,
            user_id=user_id,
            file_name=path.name,
        ),
    )
    db.commit()


# --- A. export ---------------------------------------------------------------------


def test_export_writes_every_version_with_project_independent_references(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """The export has one row per version of every prompt (10 defaults with one
    version, ``Span tagging`` with two, three more with one). Version 2 of the
    archived ``Span tagging`` references its codes by name, its example's document
    by filename and annotations by uuid, and its author by email."""
    source = prompt_eximport_projects["source"]

    df = _export(db_session, source["project"].id)

    assert len(df) == 15
    span_rows = df.loc[df["prompt_name"] == "Span tagging"].sort_values(by="version")
    assert span_rows["version"].tolist() == [1, 2]
    assert span_rows["is_archived"].tolist() == [True, True]
    assert span_rows["user_email"].tolist() == [test_user.email] * 2
    v2 = span_rows.iloc[1]
    assert v2["text"] == source["span_prompt"].versions[1].text
    selections = PromptSelectionsForExport.model_validate_json(v2["selections"])
    assert [code.code_name for code in selections.codes] == ["PERSON", "Claim"]
    [example] = selections.examples
    assert isinstance(example, SpanPromptExampleForExport)
    assert example.sdoc_filename == "example.txt"
    assert example.source_annotation_uuids == [source["alice_annotation"].uuid]
    assert [span.code_name for span in example.spans] == ["PERSON", "Claim"]


# --- B. import into a project with other data ------------------------------------
# The target has the codes, tags and metadata fields, but not the documents and
# annotations of the examples.


def test_import_remaps_selections_and_merges_prompts_by_name(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """Importing into the target appends version 2 to its ``Span tagging`` (whose
    version 1 equals the exported one) and archives it, creates the other custom
    prompts and keeps the equal defaults. The selections point to the target's
    codes, tags and metadata fields; examples whose document is missing are
    dropped."""
    projects = prompt_eximport_projects
    source = projects["source"]
    target_id = projects["target"].id
    defaults_before = {
        name: prompt
        for name, prompt in _prompts(db_session, target_id).items()
        if name not in CUSTOM_PROMPTS
    }

    _import(
        db_session, _export(db_session, source["project"].id), target_id, test_user.id
    )

    prompts = _prompts(db_session, target_id)
    assert set(prompts) == CUSTOM_PROMPTS | set(defaults_before)
    for name, default in defaults_before.items():
        assert [v.id for v in prompts[name].versions] == [
            v.id for v in default.versions
        ]

    span_prompt = prompts["Span tagging"]
    assert span_prompt.id == projects["target_span_prompt"].id
    assert span_prompt.is_archived
    assert [v.version for v in span_prompt.versions] == [1, 2]
    v2 = span_prompt.versions[1]
    assert v2.user_id == test_user.id
    assert [code.code_id for code in v2.codes] == [
        projects["target_person_code"].id,
        projects["target_claim_code"].id,
    ]
    assert v2.examples == []

    [tag_version] = prompts["Tag selection"].versions
    assert [tag.tag_id for tag in tag_version.tags] == [
        projects["target_report_tag"].id
    ]
    [metadata_version] = prompts["Metadata selection"].versions
    assert [
        field.project_metadata_id for field in metadata_version.metadata_fields
    ] == [projects["target_author_field"].id]
    [sentence_version] = prompts["Sentence examples"].versions
    assert [code.code_id for code in sentence_version.codes] == [
        projects["target_claim_code"].id
    ]
    assert sentence_version.examples == []


def test_import_twice_changes_nothing_the_second_time(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """Importing the same export again neither duplicates prompts nor
    versions."""
    projects = prompt_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    _import(db_session, df, target_id, test_user.id)
    versions_before = {
        name: [v.id for v in prompt.versions]
        for name, prompt in _prompts(db_session, target_id).items()
    }

    _import(db_session, df, target_id, test_user.id)

    assert {
        name: [v.id for v in prompt.versions]
        for name, prompt in _prompts(db_session, target_id).items()
    } == versions_before


def test_import_into_the_exported_project_changes_nothing(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """Importing a project's export into the project itself resolves every
    reference (also of the examples) to the same objects, so every version equals
    its original and nothing changes."""
    source = prompt_eximport_projects["source"]
    project_id = source["project"].id
    prompts_before = _prompts(db_session, project_id)
    span_v2 = prompts_before["Span tagging"].versions[1]
    assert isinstance(span_v2.examples[0], SpanPromptExample)

    _import(db_session, _export(db_session, project_id), project_id, test_user.id)

    assert _prompts(db_session, project_id) == prompts_before


# --- C. conflicts --------------------------------------------------------------------


def test_import_of_diverged_prompt_keeps_both_under_another_name(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """A ``Span tagging`` whose version 1 differs from the target's is imported as
    ``Span tagging (imported)`` with both versions; the target's prompt stays as
    it is, and a second import merges into the imported one instead of adding
    ``Span tagging (imported 2)``."""
    projects = prompt_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    v1_row = (df["prompt_name"] == "Span tagging") & (df["version"] == 1)
    df.loc[v1_row, "text"] = "Changed: " + df.loc[v1_row, "text"]

    _import(db_session, df, target_id, test_user.id)
    imported_version_ids = [
        v.id
        for v in _prompts(db_session, target_id)["Span tagging (imported)"].versions
    ]
    _import(db_session, df, target_id, test_user.id)

    prompts = _prompts(db_session, target_id)
    assert [v.id for v in prompts["Span tagging"].versions] == [
        v.id for v in projects["target_span_prompt"].versions
    ]
    imported = prompts["Span tagging (imported)"]
    assert [v.text.startswith("Changed: ") for v in imported.versions] == [
        True,
        False,
    ]
    assert [v.id for v in imported.versions] == imported_version_ids
    assert "Span tagging (imported 2)" not in prompts


def test_import_replaces_an_untouched_default_prompt(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """A default prompt that differs from the target's untouched default (e.g.
    exported by an older release with another default prompt) replaces it: the
    prompt keeps its id and gets the exported version instead of a duplicate."""
    projects = prompt_eximport_projects
    target_id = projects["target"].id
    default_before = _prompts(db_session, target_id)[DEFAULT_TAGS_PROMPT]
    df = _export(db_session, projects["source"]["project"].id)
    df.loc[df["prompt_name"] == DEFAULT_TAGS_PROMPT, "text"] = (
        "An older default prompt <tags> <output-format:tags> <document:whole>"
    )

    _import(db_session, df, target_id, test_user.id)

    prompts = _prompts(db_session, target_id)
    default_after = prompts[DEFAULT_TAGS_PROMPT]
    assert default_after.id == default_before.id
    assert [(v.version, v.text) for v in default_after.versions] == [
        (1, "An older default prompt <tags> <output-format:tags> <document:whole>")
    ]
    assert f"{DEFAULT_TAGS_PROMPT} (imported)" not in prompts


def test_import_drops_an_author_that_does_not_exist(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """A version whose author does not exist (e.g. in another instance) is imported
    without author instead of failing the import."""
    projects = prompt_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    df.loc[df["prompt_name"] == "Tag selection", "user_email"] = "unknown@dats.org"

    _import(db_session, df, target_id, test_user.id)

    [version] = _prompts(db_session, target_id)["Tag selection"].versions
    assert version.user_id is None


# --- D. invalid input ----------------------------------------------------------------


def test_import_without_text_column_fails_and_changes_nothing(
    db_session: Session,
    prompt_eximport_projects: PromptEximportProjects,
    test_user: UserORM,
) -> None:
    """A CSV file without the ``text`` column (e.g. a codes export) fails the
    import with ``ImportPromptsError`` before any prompt is changed."""
    projects = prompt_eximport_projects
    target_id = projects["target"].id
    prompts_before = _prompts(db_session, target_id)
    df = _export(db_session, projects["source"]["project"].id).drop(columns="text")

    with pytest.raises(ImportPromptsError, match="text"):
        _import(db_session, df, target_id, test_user.id)

    db_session.rollback()
    assert _prompts(db_session, target_id) == prompts_before
