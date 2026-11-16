"""The project doctor (tools/project_doctor) imports no DATS code, so it runs on
the released backend image, and keeps its own copy of the pipeline steps and
the status values; these tests keep the copy in sync with the backend."""

import importlib.util
from pathlib import Path
from types import ModuleType

from omegaconf import OmegaConf

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.code.system_codes import parent_names
from pipeline_test_utils import artefact_named
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_step_status_orm import (
    SourceDocumentStepStatusORM,
)

register_jobs()

DOCTOR_STORES = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "project_doctor"
    / "doctor_stores.py"
)

# The artefact the embeddings of each Weaviate collection are, by name
COLLECTION_ARTEFACTS = {
    "Document": "document_embeddings",
    "Sentence": "sentence_embeddings",
    "Image": "image_embeddings",
}


def _doctor_stores() -> ModuleType:
    spec = importlib.util.spec_from_file_location("doctor_stores", DOCTOR_STORES)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_doctor_steps_match_the_pipeline_graph() -> None:
    """The doctor knows the steps of every doctype, in pipeline order."""
    doctor = _doctor_stores()
    graph = artefact_registry.graph()
    assert doctor.PROCESSING_STEPS == {
        doctype.value: graph.steps(doctype) for doctype in DocType
    }


def test_doctor_embedding_steps_produce_the_embeddings() -> None:
    """Each embedding step of the doctor produces the embeddings of its Weaviate
    collection."""
    doctor = _doctor_stores()
    graph = artefact_registry.graph()
    producers = {
        collection: {
            step
            for doctype in DocType
            if (step := graph.producer(doctype, artefact_named(artefact))) is not None
        }
        for collection, artefact in COLLECTION_ARTEFACTS.items()
    }
    assert {c: {s} for c, s in doctor.EMBEDDING_STEPS.items()} == producers


def test_doctor_index_and_thumbnail_steps_produce_them() -> None:
    """The doctor's Elasticsearch index step produces the index of text
    documents, its thumbnail step the thumbnail of images."""
    doctor = _doctor_stores()
    graph = artefact_registry.graph()
    assert doctor.ES_INDEX_STEP == graph.producer(
        DocType.text, artefact_named("es_index")
    )
    assert doctor.IMAGE_THUMBNAIL_STEP == graph.producer(
        DocType.image, artefact_named("thumbnail")
    )


def test_doctor_checks_the_store_of_each_archive_module_or_lists_it() -> None:
    """Each artefact with an archive of the export has its store checked
    by the doctor (the embeddings, the index, the image thumbnail, see the tests
    above) or is listed as not checked, and not both."""
    doctor = _doctor_stores()
    checked = {*COLLECTION_ARTEFACTS.values(), "es_index", "thumbnail"}
    unchecked = set(doctor.UNCHECKED_STORES)
    assert checked.isdisjoint(unchecked)
    assert checked | unchecked == {a.name for a, _ in artefact_registry.archives()}


def test_doctor_reads_the_step_status_table() -> None:
    """The doctor reads the step statuses from the table of the backend."""
    doctor = _doctor_stores()
    assert doctor.STEP_STATUS_TABLE == SourceDocumentStepStatusORM.__tablename__


def test_doctor_status_values_match_the_step_statuses() -> None:
    """The doctor's status integers are the values of `SDocStatus`."""
    doctor = _doctor_stores()
    assert (
        doctor.STATUS_ERRONEOUS,
        doctor.STATUS_PROCESSING,
        doctor.STATUS_FINISHED,
    ) == (
        SDocStatus.erroneous.value,
        SDocStatus.processing.value,
        SDocStatus.finished.value,
    )


def test_doctor_system_codes_match_the_declared_code_trees() -> None:
    """The doctor's copy of the system code trees (`system_codes.yaml`) names
    every code the artefacts declare, each with the same parent."""
    doctor = _doctor_stores()
    copy = OmegaConf.load(doctor.SYSTEM_CODES_FILE).system_codes
    declared = parent_names(artefact_registry.system_codes())

    assert doctor._system_code_parents(copy) == declared
