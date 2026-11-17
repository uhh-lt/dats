"""Export/import of the feature toggles: the per-step statuses of a document and the
enabled features of a project."""

from io import StringIO

import pandas as pd
import pytest

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from modules.eximport.import_exceptions import ImportProjectDetailsError
from modules.eximport.project.import_project_details import archived_features
from modules.eximport.project.project_export_schema import (
    ProjectDetailsExportSchema,
)
from modules.eximport.sdocs.import_sdocs import archived_step_status
from modules.eximport.sdocs.sdoc_export_schema import (
    SourceDocumentExportCollection,
    SourceDocumentExportSchema,
)
from systems.artefact_system.artefact_registry import artefact_registry

register_jobs()

FINISHED = SDocStatus.finished.value
PROCESSING = SDocStatus.processing.value
ERRONEOUS = SDocStatus.erroneous.value
TEXT_STEPS = artefact_registry.graph().steps(DocType.text)


def _sdoc(**kwargs) -> SourceDocumentExportSchema:
    values = dict(
        filename="a.txt",
        name="a.txt",
        doctype=DocType.text.value,
        status=FINISHED,
        folder_name="a.txt",
        folder_parent_name=None,
        tags=[],
        word_frequencies=[],
        metadata=[],
        content="Hello world.",
        html="<p>Hello world.</p>",
        raw_html="<p>Hello world.</p>",
        token_starts=[0, 6, 11],
        token_ends=[5, 11, 12],
        sentence_starts=[0],
        sentence_ends=[12],
        document_embedding=[0.1, 0.2],
        sentence_embeddings=[[0.1, 0.2]],
        step_status=dict.fromkeys(TEXT_STEPS, FINISHED),
    )
    values.update(kwargs)
    return SourceDocumentExportSchema.model_validate(values)


def test_archive_step_status_keeps_not_planned_steps() -> None:
    """Steps archived as not planned (None) stay not planned."""
    archived: dict[str, int | None] = dict.fromkeys(TEXT_STEPS, FINISHED)
    archived["es_index"] = None
    archived["keywords"] = None

    status = archived_step_status(_sdoc(step_status=archived))

    assert status["es_index"] is None
    assert status["keywords"] is None
    assert status["named_entity_recognition"] == FINISHED


def test_processing_steps_are_imported_as_not_planned() -> None:
    """Steps archived as processing are not planned: the import starts no job, so
    they would stay processing forever. Other steps keep their status."""
    archived: dict[str, int | None] = dict.fromkeys(TEXT_STEPS, FINISHED)
    archived["es_index"] = PROCESSING
    archived["keywords"] = ERRONEOUS

    status = archived_step_status(_sdoc(step_status=archived))

    assert status["es_index"] is None
    assert status["keywords"] == ERRONEOUS
    assert status["tokens_sentences"] == FINISHED


def test_steps_missing_in_the_archive_are_not_planned() -> None:
    """Steps of the doctype that the archived statuses do not list are not planned."""
    status = archived_step_status(_sdoc(step_status={"html_extraction": FINISHED}))
    assert status["html_extraction"] == FINISHED
    assert status["tokens_sentences"] is None


def test_unknown_step_is_ignored() -> None:
    """An archived status of a step this version does not have (renamed or
    removed since the export) is dropped; the other statuses are imported."""
    sdoc = _sdoc(step_status={"removed_step": FINISHED, "html_extraction": FINISHED})

    assert sdoc.step_status == {"html_extraction": FINISHED}
    assert archived_step_status(sdoc)["html_extraction"] == FINISHED


def test_step_of_another_doctype_is_ignored() -> None:
    """The archived statuses are read for the steps of the document's doctype: the
    image caption of a text document is dropped."""
    sdoc = _sdoc(step_status={"image_caption": FINISHED})

    assert sdoc.step_status == {}


def test_invalid_step_status_is_rejected() -> None:
    """An archived status that is no step status fails the validation."""
    with pytest.raises(ValueError, match="is not a valid SDocStatus"):
        _sdoc(step_status={"html_extraction": 7})


def test_step_status_survives_the_csv_round_trip() -> None:
    """The per-step statuses, including None, are written to and read from the CSV unchanged."""
    archived: dict[str, int | None] = {
        "html_extraction": FINISHED,
        "es_index": None,
    }
    df = SourceDocumentExportCollection(
        source_documents=[_sdoc(step_status=archived)]
    ).to_dataframe()
    df = pd.read_csv(StringIO(df.to_csv(index=False)))

    collection = SourceDocumentExportCollection.from_dataframe(df)

    assert collection.source_documents[0].step_status == archived


def test_archive_without_project_details_enables_no_feature() -> None:
    """An archive without project details enables no feature."""
    assert archived_features(None) == []


def test_archived_features_are_restored() -> None:
    """The enabled features of the archive are restored."""
    details = ProjectDetailsExportSchema(
        title="p",
        description="d",
        enabled_features=["rag_chat"],
    )
    assert [f.name for f in archived_features(details)] == ["rag_chat"]


def test_unknown_feature_is_rejected() -> None:
    """An archive enabling an unknown feature is rejected with an error naming it."""
    details = ProjectDetailsExportSchema(
        title="p",
        description="d",
        enabled_features=["rag_chat", "time_travel"],
    )
    with pytest.raises(ImportProjectDetailsError, match="'time_travel'"):
        archived_features(details)
