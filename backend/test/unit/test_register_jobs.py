import pytest

from bootstrap import register_jobs
from core.doc import source_document_step_status_crud
from modules.doc_processing.doc_processing_exceptions import PipelineDeclarationError
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry

register_jobs()


def test_more_steps_than_the_feature_states_count_are_rejected(monkeypatch):
    """The feature states count each step as one bit of a BIGINT: starting DATS
    with more pipeline steps than that fails with a clear message."""
    monkeypatch.setattr(source_document_step_status_crud, "MAX_COUNTED_STEPS", 1)
    steps = len(pipeline_registry.graph().all_steps())

    with pytest.raises(PipelineDeclarationError) as error:
        register_jobs()

    assert error.value.problems == [
        f"There are {steps} pipeline steps, but the feature states count at most 1 "
        "(one bit each in a BIGINT, see crud_sdoc_step_status.count_by_project)."
    ]
