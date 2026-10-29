import pandas as pd
from sqlalchemy.orm import Session

from core.prompt_template.prompt_template_dto import (
    PromptTemplateRead,
    SpanPromptExample,
)
from core.prompt_template.prompt_template_enum import OutputFormat, PromptLanguage
from core.prompt_template.prompt_template_service import PromptTemplateService
from core.prompt_template.prompt_template_specs import default_prompt_name
from core.user.user_orm import UserORM
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.prompt_templates.export_prompt_templates import (
    export_all_prompt_templates,
)
from modules.eximport.prompt_templates.import_prompt_templates import (
    import_prompt_templates_to_proj,
)
from modules.eximport.prompt_templates.prompt_template_export_schema import (
    PromptSelectionsForExport,
    SpanPromptExampleForExport,
)
from repos.filesystem_repo import FilesystemRepo

from .conftest import PromptTemplateEximportProjects

CUSTOM_TEMPLATES = {
    "Span tagging",
    "Tag selection",
    "Metadata selection",
    "Sentence examples",
}
DEFAULT_TAGS_TEMPLATE = default_prompt_name(OutputFormat.TAGS, PromptLanguage.EN)

# ===========================================================================
# EXPORT / IMPORT OF PROMPT TEMPLATES (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export and import functions of the project export/import directly.


def _export(db: Session, project_id: int) -> pd.DataFrame:
    """Export all prompt templates of a project and read the CSV as the import
    does."""
    return read_import_csv(
        export_all_prompt_templates(db=db, fsr=FilesystemRepo(), project_id=project_id)
    )


def _templates(db: Session, project_id: int) -> dict[str, PromptTemplateRead]:
    db.expire_all()
    return {
        template.name: template
        for template in PromptTemplateService().read_prompt_templates_by_project(
            db=db, project_id=project_id
        )
    }


def _import(db: Session, df: pd.DataFrame, project_id: int) -> list[int]:
    changed_ids = import_prompt_templates_to_proj(db=db, df=df, project_id=project_id)
    db.commit()
    return changed_ids


# --- A. export ---------------------------------------------------------------------


def test_export_writes_every_version_with_project_independent_references(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
    test_user: UserORM,
) -> None:
    """The export has one row per version of every template (10 defaults with one
    version, ``Span tagging`` with two, three more with one). Version 2 of the
    archived ``Span tagging`` references its codes by name, its example's document
    by filename and annotations by uuid, and its author by email."""
    source = prompt_template_eximport_projects["source"]

    df = _export(db_session, source["project"].id)

    assert len(df) == 15
    span_rows = df.loc[df["template_name"] == "Span tagging"].sort_values(by="version")
    assert span_rows["version"].tolist() == [1, 2]
    assert span_rows["is_archived"].tolist() == [True, True]
    assert span_rows["user_email"].tolist() == [test_user.email] * 2
    v2 = span_rows.iloc[1]
    assert v2["prompt"] == source["span_template"].versions[1].prompt
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


def test_import_remaps_selections_and_merges_templates_by_name(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
    test_user: UserORM,
) -> None:
    """Importing into the target appends version 2 to its ``Span tagging`` (whose
    version 1 equals the exported one) and archives it, creates the other custom
    templates and keeps the equal defaults. The selections point to the target's
    codes, tags and metadata fields; examples whose document is missing are
    dropped."""
    projects = prompt_template_eximport_projects
    source = projects["source"]
    target_id = projects["target"].id
    defaults_before = {
        name: template
        for name, template in _templates(db_session, target_id).items()
        if name not in CUSTOM_TEMPLATES
    }

    _import(db_session, _export(db_session, source["project"].id), target_id)

    templates = _templates(db_session, target_id)
    assert set(templates) == CUSTOM_TEMPLATES | set(defaults_before)
    for name, default in defaults_before.items():
        assert [v.id for v in templates[name].versions] == [
            v.id for v in default.versions
        ]

    span_template = templates["Span tagging"]
    assert span_template.id == projects["target_span_template"].id
    assert span_template.is_archived
    assert [v.version for v in span_template.versions] == [1, 2]
    v2 = span_template.versions[1]
    assert v2.user_id == test_user.id
    assert [code.code_id for code in v2.codes] == [
        projects["target_person_code"].id,
        projects["target_claim_code"].id,
    ]
    assert v2.examples == []

    [tag_version] = templates["Tag selection"].versions
    assert [tag.tag_id for tag in tag_version.tags] == [
        projects["target_report_tag"].id
    ]
    [metadata_version] = templates["Metadata selection"].versions
    assert [
        field.project_metadata_id for field in metadata_version.metadata_fields
    ] == [projects["target_author_field"].id]
    [sentence_version] = templates["Sentence examples"].versions
    assert [code.code_id for code in sentence_version.codes] == [
        projects["target_claim_code"].id
    ]
    assert sentence_version.examples == []


def test_import_twice_changes_nothing_the_second_time(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
) -> None:
    """Importing the same export again neither duplicates templates nor
    versions."""
    projects = prompt_template_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    _import(db_session, df, target_id)
    versions_before = {
        name: [v.id for v in template.versions]
        for name, template in _templates(db_session, target_id).items()
    }

    changed_ids = _import(db_session, df, target_id)

    assert changed_ids == []
    assert {
        name: [v.id for v in template.versions]
        for name, template in _templates(db_session, target_id).items()
    } == versions_before


def test_import_into_the_exported_project_changes_nothing(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
) -> None:
    """Importing a project's export into the project itself resolves every
    reference (also of the examples) to the same objects, so every version equals
    its original and nothing changes."""
    source = prompt_template_eximport_projects["source"]
    project_id = source["project"].id
    templates_before = _templates(db_session, project_id)
    span_v2 = templates_before["Span tagging"].versions[1]
    assert isinstance(span_v2.examples[0], SpanPromptExample)

    changed_ids = _import(db_session, _export(db_session, project_id), project_id)

    assert changed_ids == []
    assert _templates(db_session, project_id) == templates_before


# --- C. conflicts --------------------------------------------------------------------


def test_import_of_diverged_template_keeps_both_under_another_name(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
) -> None:
    """A ``Span tagging`` whose version 1 differs from the target's is imported as
    ``Span tagging (imported)`` with both versions; the target's template stays as
    it is, and a second import merges into the imported one instead of adding
    ``Span tagging (imported 2)``."""
    projects = prompt_template_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    v1_row = (df["template_name"] == "Span tagging") & (df["version"] == 1)
    df.loc[v1_row, "prompt"] = "Changed: " + df.loc[v1_row, "prompt"]

    _import(db_session, df, target_id)
    second_changed_ids = _import(db_session, df, target_id)

    templates = _templates(db_session, target_id)
    assert [v.id for v in templates["Span tagging"].versions] == [
        v.id for v in projects["target_span_template"].versions
    ]
    imported = templates["Span tagging (imported)"]
    assert [v.prompt.startswith("Changed: ") for v in imported.versions] == [
        True,
        False,
    ]
    assert "Span tagging (imported 2)" not in templates
    assert second_changed_ids == []


def test_import_replaces_an_untouched_default_template(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
) -> None:
    """A default template that differs from the target's untouched default (e.g.
    exported by an older release with another default prompt) replaces it: the
    template keeps its id and gets the exported version instead of a duplicate."""
    projects = prompt_template_eximport_projects
    target_id = projects["target"].id
    default_before = _templates(db_session, target_id)[DEFAULT_TAGS_TEMPLATE]
    df = _export(db_session, projects["source"]["project"].id)
    df.loc[df["template_name"] == DEFAULT_TAGS_TEMPLATE, "prompt"] = (
        "An older default prompt <tags> <output-format:tags> <document:whole>"
    )

    _import(db_session, df, target_id)

    templates = _templates(db_session, target_id)
    default_after = templates[DEFAULT_TAGS_TEMPLATE]
    assert default_after.id == default_before.id
    assert [(v.version, v.prompt) for v in default_after.versions] == [
        (1, "An older default prompt <tags> <output-format:tags> <document:whole>")
    ]
    assert f"{DEFAULT_TAGS_TEMPLATE} (imported)" not in templates


def test_import_drops_an_author_that_does_not_exist(
    db_session: Session,
    prompt_template_eximport_projects: PromptTemplateEximportProjects,
) -> None:
    """A version whose author does not exist (e.g. in another instance) is imported
    without author instead of failing the import."""
    projects = prompt_template_eximport_projects
    target_id = projects["target"].id
    df = _export(db_session, projects["source"]["project"].id)
    df.loc[df["template_name"] == "Tag selection", "user_email"] = "unknown@dats.org"

    _import(db_session, df, target_id)

    [version] = _templates(db_session, target_id)["Tag selection"].versions
    assert version.user_id is None
