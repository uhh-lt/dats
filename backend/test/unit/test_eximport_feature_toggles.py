"""Export/import of the feature toggles: the per-step statuses of a document and the
enabled features of a project."""

from io import StringIO

import pandas as pd
import pytest

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
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

register_jobs()

FINISHED = SDocStatus.finished.value
PROCESSING = SDocStatus.processing.value
ERRONEOUS = SDocStatus.erroneous.value
TEXT_STEPS = pipeline_registry.graph().steps(DocType.text)


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
        step_status={step.value: FINISHED for step in TEXT_STEPS},
    )
    values.update(kwargs)
    return SourceDocumentExportSchema.model_validate(values)


def test_legacy_archive_without_embeddings_does_not_plan_their_steps() -> None:
    """Embedding steps whose embeddings the archive lacks are not planned, the other steps keep the status."""
    status = archived_step_status(
        _sdoc(document_embedding=None, sentence_embeddings=[])
    )
    assert status[JobType.TEXT_DOCUMENT_EMBEDDING.value] is None
    assert status[JobType.TEXT_SENTENCE_EMBEDDING.value] is None
    assert status[JobType.TEXT_SPACY.value] == FINISHED


def test_archive_with_partial_sentence_embeddings_does_not_plan_their_step() -> None:
    """Archives of older versions hold at most 25 sentence embeddings: without one
    embedding per sentence, the sentence embedding step is not planned."""
    status = archived_step_status(
        _sdoc(
            sentence_starts=[0, 6],
            sentence_ends=[5, 12],
            sentence_embeddings=[[0.1, 0.2]],
        )
    )
    assert status[JobType.TEXT_SENTENCE_EMBEDDING.value] is None
    assert status[JobType.TEXT_SPACY.value] == FINISHED


def test_archive_step_status_keeps_not_planned_steps() -> None:
    """Steps archived as not planned (None) stay not planned."""
    archived: dict[str, int | None] = {step.value: FINISHED for step in TEXT_STEPS}
    archived[JobType.TEXT_ES_INDEX.value] = None
    archived[JobType.TEXT_KEYWORDS.value] = None

    status = archived_step_status(_sdoc(step_status=archived))

    assert status[JobType.TEXT_ES_INDEX.value] is None
    assert status[JobType.TEXT_KEYWORDS.value] is None
    assert status[JobType.TEXT_NER.value] == FINISHED


def test_processing_steps_are_imported_as_not_planned() -> None:
    """Steps archived as processing are not planned: the import starts no job, so
    they would stay processing forever. Other steps keep their status."""
    archived: dict[str, int | None] = {step.value: FINISHED for step in TEXT_STEPS}
    archived[JobType.TEXT_ES_INDEX.value] = PROCESSING
    archived[JobType.TEXT_KEYWORDS.value] = ERRONEOUS

    status = archived_step_status(_sdoc(step_status=archived))

    assert status[JobType.TEXT_ES_INDEX.value] is None
    assert status[JobType.TEXT_KEYWORDS.value] == ERRONEOUS
    assert status[JobType.TEXT_SPACY.value] == FINISHED


def test_steps_missing_in_the_archive_are_not_planned() -> None:
    """Steps of the doctype that the archived statuses do not list are not planned."""
    status = archived_step_status(
        _sdoc(step_status={JobType.EXTRACT_HTML.value: FINISHED})
    )
    assert status[JobType.EXTRACT_HTML.value] == FINISHED
    assert status[JobType.TEXT_SPACY.value] is None


def test_unknown_step_is_ignored() -> None:
    """An archived status of a step this version does not have (renamed or
    removed since the export) is dropped; the other statuses are imported."""
    sdoc = _sdoc(
        step_status={"removed_step": FINISHED, JobType.EXTRACT_HTML.value: FINISHED}
    )

    assert sdoc.step_status == {JobType.EXTRACT_HTML.value: FINISHED}
    assert archived_step_status(sdoc)[JobType.EXTRACT_HTML.value] == FINISHED


def test_step_of_another_doctype_is_ignored() -> None:
    """The archived statuses are read for the steps of the document's doctype: the
    image caption of a text document is dropped."""
    sdoc = _sdoc(step_status={JobType.IMAGE_CAPTION.value: FINISHED})

    assert sdoc.step_status == {}


def test_invalid_step_status_is_rejected() -> None:
    """An archived status that is no step status fails the validation."""
    with pytest.raises(ValueError, match="is not a valid SDocStatus"):
        _sdoc(step_status={JobType.EXTRACT_HTML.value: 7})


def test_step_status_survives_the_csv_round_trip() -> None:
    """The per-step statuses, including None, are written to and read from the CSV unchanged."""
    archived: dict[str, int | None] = {
        JobType.EXTRACT_HTML.value: FINISHED,
        JobType.TEXT_ES_INDEX.value: None,
    }
    df = SourceDocumentExportCollection(
        source_documents=[_sdoc(step_status=archived)]
    ).to_dataframe()
    df = pd.read_csv(StringIO(df.to_csv(index=False)))

    collection = SourceDocumentExportCollection.from_dataframe(df)

    assert collection.source_documents[0].step_status == archived


def test_archive_without_project_details_enables_all_features() -> None:
    """An archive without project details (old archives) enables all features."""
    assert archived_features(None) == list(Feature)


def test_archived_features_are_restored() -> None:
    """The enabled features of the archive are restored."""
    details = ProjectDetailsExportSchema(
        title="p",
        description="d",
        enabled_features=[Feature.RAG_CHAT.value],
    )
    assert archived_features(details) == [Feature.RAG_CHAT]


def test_unknown_feature_is_rejected() -> None:
    """An archive enabling an unknown feature is rejected with an error naming it."""
    details = ProjectDetailsExportSchema(
        title="p",
        description="d",
        enabled_features=[Feature.RAG_CHAT.value, "time_travel"],
    )
    with pytest.raises(ImportProjectDetailsError, match="'time_travel'"):
        archived_features(details)
