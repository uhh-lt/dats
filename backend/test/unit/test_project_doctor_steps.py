"""The project doctor (tools/project_doctor) imports no DATS code, so it runs on
the released backend image, and keeps its own copy of the pipeline steps; these
tests keep the copy in sync with the backend."""

import importlib.util
from pathlib import Path
from types import ModuleType

from bootstrap import register_jobs
from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from core.doc.source_document_step_status_orm import SourceDocumentStepStatusORM
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry

register_jobs()

DOCTOR_STORES = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "project_doctor"
    / "doctor_stores.py"
)

# The artefact the embeddings of each Weaviate collection are
COLLECTION_ARTEFACTS = {
    "Document": Artefact.DOCUMENT_EMBEDDINGS,
    "Sentence": Artefact.SENTENCE_EMBEDDINGS,
    "Image": Artefact.IMAGE_EMBEDDINGS,
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
    graph = pipeline_registry.graph()
    assert doctor.PROCESSING_STEPS == {
        doctype.value: [step.value for step in graph.steps(doctype)]
        for doctype in DocType
    }


def test_doctor_embedding_steps_produce_the_embeddings() -> None:
    """Each embedding step of the doctor produces the embeddings of its Weaviate
    collection."""
    doctor = _doctor_stores()
    graph = pipeline_registry.graph()
    producers = {
        collection: {
            step.value
            for doctype in DocType
            if (step := graph.producer(doctype, artefact)) is not None
        }
        for collection, artefact in COLLECTION_ARTEFACTS.items()
    }
    assert {c: {s} for c, s in doctor.EMBEDDING_STEPS.items()} == producers


def test_doctor_index_and_thumbnail_steps_produce_them() -> None:
    """The doctor's Elasticsearch index step produces the index of text
    documents, its thumbnail step the thumbnail of images."""
    doctor = _doctor_stores()
    graph = pipeline_registry.graph()
    assert doctor.ES_INDEX_STEP == graph.producer(DocType.text, Artefact.ES_INDEX)
    assert doctor.IMAGE_THUMBNAIL_STEP == graph.producer(
        DocType.image, Artefact.THUMBNAIL
    )


def test_doctor_reads_the_step_status_table() -> None:
    """The doctor reads the step statuses from the table of the backend."""
    doctor = _doctor_stores()
    assert doctor.STEP_STATUS_TABLE == SourceDocumentStepStatusORM.__tablename__
