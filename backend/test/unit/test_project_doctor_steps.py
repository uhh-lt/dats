"""The project doctor (tools/project_doctor) imports no DATS code and keeps its own
copy of the pipeline steps; these tests keep the copy in sync with the backend."""

import importlib.util
from pathlib import Path
from types import ModuleType

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from core.doc.source_document_orm import SDOC_STATUS_COLUMNS
from systems.job_system.pipeline_graph import pipeline_registry

register_jobs()

DOCTOR_STORES = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "project_doctor"
    / "doctor_stores.py"
)


def _doctor_stores() -> ModuleType:
    spec = importlib.util.spec_from_file_location("doctor_stores", DOCTOR_STORES)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_doctor_steps_match_the_pipeline_graph() -> None:
    """The doctor knows the steps of every doctype, in pipeline order."""
    doctor = _doctor_stores()
    graph = pipeline_registry.graph()
    assert doctor.PROCESSING_STEPS == {
        doctype.value: [step.value for step in graph.steps(doctype)]
        for doctype in DocType
    }


def test_doctor_steps_are_status_columns() -> None:
    """Every step the doctor reads is a status column of sourcedocument."""
    doctor = _doctor_stores()
    assert set(doctor.ALL_STEPS) <= set(SDOC_STATUS_COLUMNS)
    assert doctor.NEW_STEPS <= set(doctor.ALL_STEPS)
