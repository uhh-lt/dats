import zipfile
from collections.abc import Callable
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.artefacts.audio.audio_artefact import audio_stream_path
from core.artefacts.sentence_embeddings.sentence_embedding_crud import (
    crud_sentence_embedding,
)
from core.artefacts.thumbnail.thumbnail_file_crud import crud_thumbnail_file
from core.artefacts.thumbnail.web_image_file_crud import crud_web_image_file
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_file_crud import crud_sdoc_file
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from dats_test_utils import new_temporary_folder
from job_test_utils import HeldJobs
from modules.eximport.import_exceptions import ImportSourceDocumentsError
from modules.eximport.project import import_project as import_project_module
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from modules.eximport.sdocs.export_sdocs import export_all_sdocs
from modules.eximport.sdocs.import_sdocs import (
    ARCHIVE_WITHOUT_STEP_STATUS,
    import_sdocs_to_proj,
)
from modules.simsearch.image_embedding_crud import crud_image_embedding
from modules.simsearch.image_embedding_dto import ImageObjectIdentifier
from modules.tag_recommendation.document_embedding_crud import crud_document_embedding
from modules.tag_recommendation.document_embedding_dto import DocumentObjectIdentifier
from pipeline_test_utils import (
    artefact_named,
    read_all_step_status,
    read_step_status,
    started_steps,
)
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.step_execution import start_steps

from .conftest import FeatureToggleEximportProjects

SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    language=Language.english,
    model="default",
)

# ===========================================================================
# EXPORT / IMPORT OF A PROJECT WITH DISABLED FEATURES (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export and import functions of the jobs directly.


def _round_trip(db: Session, projects: FeatureToggleEximportProjects) -> None:
    """Export the project and import the archive into the target project."""
    out_dir = new_temporary_folder()
    archive = export_project(db=db, out_dir=out_dir, project_id=projects["project"].id)
    import_dir = out_dir / "import"
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    import_project(
        db=db,
        path_to_dir=import_dir,
        project_id=projects["target_project"].id,
    )
    db.commit()


def _imported(
    db: Session, projects: FeatureToggleEximportProjects, filename: str
) -> SourceDocumentORM:
    """The imported document of the target project with the filename."""
    sdoc = crud_sdoc.read_by_filename(
        db=db,
        project_id=projects["target_project"].id,
        filename=filename,
        only_finished=False,
    )
    assert sdoc is not None
    return sdoc


def _file(sdoc: SourceDocumentORM) -> Path:
    """The path of the document's uploaded file."""
    return crud_sdoc_file.path(
        project_id=sdoc.project_id, id=sdoc.id, name=sdoc.filename
    )


def _export_documents(
    db: Session, projects: FeatureToggleEximportProjects
) -> tuple[Path, Path]:
    """Export the documents of the project and extract the archive. Returns the
    directory to import and its data file (CSV)."""
    out_dir = new_temporary_folder()
    archive = export_all_sdocs(
        db=db, out_dir=out_dir, project_id=projects["project"].id
    )
    import_dir = out_dir / "import"
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    (data_file,) = import_dir.glob("*.csv")
    return import_dir, data_file


def _step_status(db: Session, sdoc: SourceDocumentORM) -> dict[str, int]:
    """The status of the planned steps of the document."""
    return read_all_step_status(db, sdoc.id)


def test_project_import_merges_the_enabled_features(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """The target project enables keyword statistics, the archive semantic
    search: the import enables both and disables nothing. The
    exported project's stored name of an unregistered feature is not exported,
    so the archive is accepted."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    target = crud_project.read(db=db_session, id=projects["target_project"].id)
    assert target.enabled_features == [
        "keyword_statistics",
        "semantic_search",
    ]


def test_project_import_does_not_lock_the_project_while_importing_documents(
    db_session: Session,
    feature_toggle_eximport_projects: FeatureToggleEximportProjects,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The import enables the archived features last, so the project stays
    unlocked while the documents are imported: another transaction (the
    `sdoc_init` of an upload) can lock it FOR SHARE meanwhile."""
    projects = feature_toggle_eximport_projects
    project_id = projects["target_project"].id
    import_sdocs = import_project_module.import_sdocs_to_proj
    locked: list[bool] = []

    def _import_sdocs_and_lock_the_project(**kwargs) -> None:
        import_sdocs(**kwargs)
        with SQLRepo().transaction() as db:
            row = db.execute(
                text("SELECT id FROM project WHERE id = :id FOR SHARE SKIP LOCKED"),
                {"id": project_id},
            ).first()
            locked.append(row is None)

    monkeypatch.setattr(
        import_project_module,
        "import_sdocs_to_proj",
        _import_sdocs_and_lock_the_project,
    )

    _round_trip(db_session, projects)

    assert locked == [False]


def test_project_import_plans_and_starts_nothing(
    db_session: Session,
    feature_toggle_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
) -> None:
    """Keyword statistics is enabled in the target, but the import neither plans
    its steps for the imported documents nor starts a job: no step is processing
    and the keywords stay not planned."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    imported = crud_sdoc.read_by_project(
        db=db_session, project_id=projects["target_project"].id, only_finished=False
    )
    assert len(imported) == 3
    for sdoc in imported:
        assert 0 not in _step_status(db_session, sdoc).values(), sdoc.filename
        assert "keywords" not in _step_status(db_session, sdoc)
    assert held_jobs.jobs() == []


def test_project_round_trip_keeps_step_statuses(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """Every imported document has the step statuses of its original: finished
    steps stay finished and not planned steps stay not planned. The image with
    an empty caption (empty HTML) is imported as well."""
    projects = feature_toggle_eximport_projects
    expected = {
        sdoc.filename: _step_status(db_session, sdoc)
        for sdoc in (projects["text"], projects["image"], projects["video"])
    }

    _round_trip(db_session, projects)

    imported = crud_sdoc.read_by_project(
        db=db_session, project_id=projects["target_project"].id, only_finished=False
    )
    assert {
        sdoc.filename: _step_status(db_session, sdoc) for sdoc in imported
    } == expected
    image = next(sdoc for sdoc in imported if sdoc.doctype == DocType.image)
    assert image.data is not None
    assert (image.data.html, image.data.raw_html) == ("", "")


def test_archive_without_one_embedding_per_sentence_imports_the_step_not_planned(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """An archive whose text holds 25 of its 30 sentence embeddings (as archives of
    older versions do) imports the text with its sentence embedding step not
    planned; the document embedding step stays finished."""
    projects = feature_toggle_eximport_projects
    import_dir, data_file = _export_documents(db_session, projects)
    df = pd.read_csv(data_file)
    df.loc[df["filename"] == "text.txt", "sentence_embeddings"] = str(
        projects["sentence_embeddings"][:25]
    )
    df.to_csv(data_file, index=False)

    import_sdocs_to_proj(
        db=db_session, path_to_dir=import_dir, project_id=projects["target_project"].id
    )

    status = _step_status(db_session, _imported(db_session, projects, "text.txt"))
    assert "sentence_embedding" not in status
    assert status["document_embedding"] == SDocStatus.finished


def test_archive_without_step_status_is_rejected(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """A documents archive without the status of each step (exported by a version
    before the feature toggles) is rejected with a message that says so."""
    projects = feature_toggle_eximport_projects
    import_dir, data_file = _export_documents(db_session, projects)
    pd.read_csv(data_file).drop(columns=["step_status"]).to_csv(data_file, index=False)

    with pytest.raises(ImportSourceDocumentsError) as error:
        import_sdocs_to_proj(
            db=db_session,
            path_to_dir=import_dir,
            project_id=projects["target_project"].id,
        )

    assert ARCHIVE_WITHOUT_STEP_STATUS in str(error.value)


# ===========================================================================
# ROUND TRIP OF EACH ARTEFACT ARCHIVE (artefact_registry.archives())
# ===========================================================================
# Each artefact archive has one case: it reads the artefact of a document
# from its store. After the project export and import, every imported document
# whose producing step finished has the data of its original.


def _document_embedding(db: Session, sdoc: SourceDocumentORM) -> object:
    return crud_document_embedding.read(
        client=WeaviateRepo().get_client(),
        project_id=sdoc.project_id,
        id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
    )


def _sentence_embeddings(db: Session, sdoc: SourceDocumentORM) -> object:
    """The embeddings by sentence id, whatever order Weaviate returns them in."""
    embeddings = crud_sentence_embedding.read_by_sdoc_id(
        client=WeaviateRepo().get_client(),
        project_id=sdoc.project_id,
        sdoc_id=sdoc.id,
    )
    return {se.id.sentence_id: se.embedding for se in embeddings}


def _image_embedding(db: Session, sdoc: SourceDocumentORM) -> object:
    return crud_image_embedding.read(
        client=WeaviateRepo().get_client(),
        project_id=sdoc.project_id,
        id=ImageObjectIdentifier(sdoc_id=sdoc.id),
    )


def _word_frequencies(db: Session, sdoc: SourceDocumentORM) -> object:
    return sorted((wf.word, wf.count) for wf in sdoc.word_frequencies)


def _index_entry(db: Session, sdoc: SourceDocumentORM) -> object:
    entry = crud_sdoc_elastic.read(
        client=ElasticSearchRepo().get_client(), project_id=sdoc.project_id, id=sdoc.id
    )
    return (entry.filename, entry.content)


def _thumbnails(db: Session, sdoc: SourceDocumentORM) -> object:
    """The web image and thumbnail files that exist."""
    folders = [
        crud_web_image_file.dir(project_id=sdoc.project_id, id=sdoc.id),
        crud_thumbnail_file.dir(project_id=sdoc.project_id, id=sdoc.id),
    ]
    return {
        f"{folder.parent.name}/{file.name}": file.read_bytes()
        for folder in folders
        for file in sorted(folder.glob("*"))
    }


def _audio_stream(db: Session, sdoc: SourceDocumentORM) -> object:
    """The extracted audio stream, and whether recomputing the transcription
    starts (its enricher needs the audio stream)."""
    started = start_steps(
        project_id=sdoc.project_id,
        sdoc_id=sdoc.id,
        steps=["transcription"],
        settings=SETTINGS,
    )
    return (
        audio_stream_path(
            project_id=sdoc.project_id,
            sdoc_id=sdoc.id,
            doctype=DocType(sdoc.doctype),
            filename=sdoc.filename,
        ).read_bytes(),
        started["transcription"] is not None,
    )


ROUND_TRIP_CASES: dict[str, Callable[[Session, SourceDocumentORM], object]] = {
    "document_embeddings": _document_embedding,
    "sentence_embeddings": _sentence_embeddings,
    "image_embeddings": _image_embedding,
    "word_frequencies": _word_frequencies,
    "es_index": _index_entry,
    "thumbnail": _thumbnails,
    "audio": _audio_stream,
}


def _artefact_data(db: Session, project_id: int, artefact: str) -> dict:
    """The artefact's data of each document of the project whose step producing
    it finished, by filename."""
    graph = artefact_registry.graph()
    db.expire_all()
    data = {}
    for sdoc in crud_sdoc.read_by_project(
        db=db, project_id=project_id, only_finished=False
    ):
        step = graph.producer(DocType(sdoc.doctype), artefact_named(artefact))
        if step is None or _step_status(db, sdoc).get(step) != SDocStatus.finished:
            continue
        data[sdoc.filename] = ROUND_TRIP_CASES[artefact](db, sdoc)
    return data


@pytest.mark.parametrize(
    "artefact", [pytest.param(name, id=name) for name in ROUND_TRIP_CASES]
)
def test_project_round_trip_keeps_the_data_of_each_archive_module(
    db_session: Session,
    feature_toggle_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
    artefact: str,
) -> None:
    """Each imported document has the artefact data of its original: the
    embeddings of the text (one per sentence, by sentence id) and of the image,
    the word frequencies and the index entry of the text, the WebP and thumbnail
    of the image, the thumbnail of the video, and the
    audio stream of the video, from which the transcription can be recomputed.
    An artefact archive without a case fails."""
    projects = feature_toggle_eximport_projects
    original = _artefact_data(db_session, projects["project"].id, artefact)

    _round_trip(db_session, projects)

    assert original, "the fixture holds no data of the artefact"
    assert (
        _artefact_data(db_session, projects["target_project"].id, artefact) == original
    )


def test_every_archive_module_has_a_round_trip_case() -> None:
    """The round trip covers each artefact archive, and no case names an artefact
    without one."""
    assert set(ROUND_TRIP_CASES) == {a.name for a, _ in artefact_registry.archives()}


def _has_index_entry(db: Session, sdoc: SourceDocumentORM) -> bool:
    """Whether the search index of the document's project holds the document."""
    return bool(
        ElasticSearchRepo()
        .get_client()
        .exists(
            index=crud_sdoc_elastic.index.get_index_name(project_id=sdoc.project_id),
            id=str(sdoc.id),
        )
    )


def _recompute(
    client: TestClient, projects: FeatureToggleEximportProjects, step: str, sdoc_id: int
):
    return client.post(
        f"/docprocessing/project/{projects['target_project'].id}/recompute",
        params={"processing_step": step},
        json={"sdoc_ids": [sdoc_id], "settings": SETTINGS.model_dump(mode="json")},
    )


def test_recompute_plans_the_core_index_step_an_import_left_unplanned(
    client: TestClient,
    db_session: Session,
    indexing_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
) -> None:
    """The imported text has no row of the core step es_index and no
    index entry (it was processing at the export). No feature computes it, so
    Recompute plans it and starts its job, which indexes the document."""
    projects = indexing_eximport_projects
    _round_trip(db_session, projects)
    sdoc = _imported(db_session, projects, "text.txt")
    assert read_step_status(db_session, sdoc.id, "es_index") is None
    assert not _has_index_entry(db_session, sdoc)

    response = _recompute(client, projects, "es_index", sdoc.id)

    assert response.status_code == 200, response.text
    assert read_step_status(db_session, sdoc.id, "es_index") == 0
    assert started_steps(held_jobs) == {sdoc.id: ["es_index"]}
    held_jobs.run("es_index")
    assert read_step_status(db_session, sdoc.id, "es_index") == 1
    assert _has_index_entry(db_session, sdoc)


def test_recompute_plans_every_missing_core_step_of_an_imported_document(
    client: TestClient,
    db_session: Session,
    mid_pipeline_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
) -> None:
    """The imported text has no row of tokens_sentences and es_index. Recompute
    of es_index plans both, as processing, and starts both, as the
    inputs of both are finished (es_index does not follow tokens_sentences)."""
    projects = mid_pipeline_eximport_projects
    _round_trip(db_session, projects)
    sdoc_id = _imported(db_session, projects, "text.txt").id
    assert read_step_status(db_session, sdoc_id, "tokens_sentences") is None
    assert read_step_status(db_session, sdoc_id, "es_index") is None

    response = _recompute(client, projects, "es_index", sdoc_id)

    assert response.status_code == 200, response.text
    assert read_step_status(db_session, sdoc_id, "tokens_sentences") == 0
    assert read_step_status(db_session, sdoc_id, "es_index") == 0
    assert started_steps(held_jobs) == {sdoc_id: ["es_index", "tokens_sentences"]}
