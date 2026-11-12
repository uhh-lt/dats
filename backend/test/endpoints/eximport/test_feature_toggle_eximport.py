import zipfile
from pathlib import Path

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from job_test_utils import HeldJobs
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from modules.doc_processing.step_run import start_steps
from modules.doc_processing.video.video_utils import audio_stream_path
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from pipeline_test_utils import read_all_step_status
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


def test_project_round_trip_keeps_sentence_embeddings_per_sentence(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """Each sentence of the imported text document gets the embedding of the same
    sentence of the original, whatever order Weaviate returns them in."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    imported_text = crud_sdoc.read_by_filename(
        db=db_session,
        project_id=projects["target_project"].id,
        filename="text.txt",
        only_finished=False,
    )
    assert imported_text is not None
    embeddings = crud_sentence_embedding.read_by_sdoc_id(
        client=WeaviateRepo().get_client(),
        project_id=projects["target_project"].id,
        sdoc_id=imported_text.id,
    )
    by_sentence = {se.id.sentence_id: se.embedding for se in embeddings}
    assert by_sentence == dict(enumerate(projects["sentence_embeddings"]))


def test_project_round_trip_extracts_the_audio_of_a_video_again(
    db_session: Session,
    feature_toggle_eximport_projects: FeatureToggleEximportProjects,
    held_jobs: HeldJobs,
) -> None:
    """The archive holds only the uploaded video: the import extracts its audio
    stream again, so recomputing the transcription of the imported video starts."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    video = _imported(db_session, projects, "clip.mp4")
    assert audio_stream_path(_file(video)).exists()
    started = start_steps(
        project_id=video.project_id,
        sdoc_id=video.id,
        steps=[JobType.AUDIO_TRANSCRIPTION],
        settings=SETTINGS,
    )
    assert started[JobType.AUDIO_TRANSCRIPTION] is not None
