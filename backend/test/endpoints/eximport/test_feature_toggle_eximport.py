import zipfile
from collections.abc import Callable
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from job_test_utils import HeldJobs
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.step_run import start_steps
from modules.doc_processing.video.video_utils import audio_stream_path
from modules.eximport.import_exceptions import ImportSourceDocumentsError
from modules.eximport.project import import_project as import_project_module
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from modules.eximport.sdocs.artefact_archive import archive_modules
from modules.eximport.sdocs.export_sdocs import export_all_sdocs
from modules.eximport.sdocs.import_sdocs import (
    ARCHIVE_WITHOUT_STEP_STATUS,
    import_sdocs_to_proj,
)
from pipeline_test_utils import read_all_step_status
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo

from .conftest import FeatureToggleEximportProjects

SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
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
    fsr = FilesystemRepo()
    archive = export_project(db=db, fsr=fsr, project_id=projects["project"].id)
    import_dir = fsr.create_temp_dir("feature_toggle_eximport")
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    import_project(
        db=db,
        fsr=fsr,
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
    return FilesystemRepo().get_path_to_sdoc_file(
        SourceDocumentRead.model_validate(sdoc), raise_if_not_exists=True
    )


def _export_documents(
    db: Session, projects: FeatureToggleEximportProjects
) -> tuple[Path, Path]:
    """Export the documents of the project and extract the archive. Returns the
    directory to import and its data file (CSV)."""
    fsr = FilesystemRepo()
    archive = export_all_sdocs(db=db, fsr=fsr, project_id=projects["project"].id)
    import_dir = fsr.create_temp_dir("feature_toggle_documents")
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
    """The target project enables keyword statistics, the archive sentence
    similarity search: the import enables both and disables nothing."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    target = crud_project.read(db=db_session, id=projects["target_project"].id)
    assert target.enabled_features == [
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.KEYWORD_STATISTICS,
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
        assert JobType.TEXT_KEYWORDS.value not in _step_status(db_session, sdoc)
    assert held_jobs.jobs() == []


def test_project_round_trip_keeps_step_statuses(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """Every imported document has the step statuses of its original: finished
    steps stay finished and not planned steps stay not planned. The image without
    caption (empty HTML) is imported as well."""
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
    assert JobType.TEXT_SENTENCE_EMBEDDING.value not in status
    assert status[JobType.TEXT_DOCUMENT_EMBEDDING.value] == SDocStatus.finished


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
# ROUND TRIP OF EACH ARCHIVE MODULE (eximport/sdocs/artefact_archive.py)
# ===========================================================================
# Each archive module has one case: it reads the module's artefact of a document
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
    """The WebP and thumbnail files that exist, and the file `repo_url` links."""
    fsr = FilesystemRepo()
    files = [
        Path(fsr.generate_sdoc_filename(_file(sdoc), webp=True, thumbnail=thumbnail))
        for thumbnail in (False, True)
    ]
    assert sdoc.data is not None
    return (
        {file.name: file.read_bytes() for file in files if file.exists()},
        Path(sdoc.data.repo_url).name,
    )


def _audio_stream(db: Session, sdoc: SourceDocumentORM) -> object:
    """The extracted audio stream, and whether recomputing the transcription
    starts (its enricher needs the audio stream)."""
    started = start_steps(
        project_id=sdoc.project_id,
        sdoc_id=sdoc.id,
        steps=[JobType.AUDIO_TRANSCRIPTION],
        settings=SETTINGS,
    )
    return (
        audio_stream_path(_file(sdoc)).read_bytes(),
        started[JobType.AUDIO_TRANSCRIPTION] is not None,
    )


ROUND_TRIP_CASES: dict[Artefact, Callable[[Session, SourceDocumentORM], object]] = {
    Artefact.DOCUMENT_EMBEDDINGS: _document_embedding,
    Artefact.SENTENCE_EMBEDDINGS: _sentence_embeddings,
    Artefact.IMAGE_EMBEDDINGS: _image_embedding,
    Artefact.WORD_FREQUENCIES: _word_frequencies,
    Artefact.ES_INDEX: _index_entry,
    Artefact.THUMBNAIL: _thumbnails,
    Artefact.AUDIO: _audio_stream,
}


def _artefact_data(db: Session, project_id: int, artefact: Artefact) -> dict:
    """The artefact's data of each document of the project whose step producing
    it finished, by filename."""
    graph = pipeline_registry.graph()
    db.expire_all()
    data = {}
    for sdoc in crud_sdoc.read_by_project(
        db=db, project_id=project_id, only_finished=False
    ):
        step = graph.producer(DocType(sdoc.doctype), artefact)
        if (
            step is None
            or _step_status(db, sdoc).get(step.value) != SDocStatus.finished
        ):
            continue
        data[sdoc.filename] = ROUND_TRIP_CASES[artefact](db, sdoc)
    return data


@pytest.mark.parametrize(
    "artefact", [pytest.param(a, id=a.value) for a in archive_modules()]
)
def test_project_round_trip_keeps_the_data_of_each_archive_module(
    db_session: Session,
    feature_toggle_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
    artefact: Artefact,
) -> None:
    """Each imported document has the artefact data of its original: the
    embeddings of the text (one per sentence, by sentence id) and of the image,
    the word frequencies and the index entry of the text, the WebP and thumbnail
    of the image, the thumbnail of the video (linked as `repo_url`), and the
    audio stream of the video, from which the transcription can be recomputed.
    An archive module without a case fails."""
    projects = feature_toggle_eximport_projects
    original = _artefact_data(db_session, projects["project"].id, artefact)

    _round_trip(db_session, projects)

    assert original, "the fixture holds no data of the artefact"
    assert (
        _artefact_data(db_session, projects["target_project"].id, artefact) == original
    )


def test_every_archive_module_has_a_round_trip_case() -> None:
    """The round trip covers each archive module, and no case names an artefact
    without one."""
    assert set(ROUND_TRIP_CASES) == set(archive_modules())
