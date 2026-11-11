import zipfile

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SDOC_STATUS_COLUMNS, SourceDocumentORM
from core.project.project_crud import crud_project
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import JobInputBase

from .conftest import FeatureToggleEximportProjects

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


def _step_status(sdoc: SourceDocumentORM) -> dict[str, int | None]:
    return {step: getattr(sdoc, step) for step in SDOC_STATUS_COLUMNS}


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
    started_jobs: list[tuple[JobType, JobInputBase]],
) -> None:
    """Keyword statistics is enabled in the target, but the import neither plans
    its steps for the imported documents nor starts a job: no step is processing
    and the keywords stay not planned."""
    projects = feature_toggle_eximport_projects

    _round_trip(db_session, projects)

    imported = crud_sdoc.read_by_project(
        db=db_session, project_id=projects["target_project"].id, only_finished=False
    )
    assert len(imported) == 2
    for sdoc in imported:
        assert 0 not in _step_status(sdoc).values(), sdoc.filename
        assert sdoc.text_keywords is None, sdoc.filename
    assert started_jobs == []


def test_project_round_trip_keeps_step_statuses(
    db_session: Session, feature_toggle_eximport_projects: FeatureToggleEximportProjects
) -> None:
    """Every imported document has the step statuses of its original: finished
    steps stay finished and not planned steps stay NULL. The image without
    caption (empty HTML) is imported as well."""
    projects = feature_toggle_eximport_projects
    expected = {
        sdoc.filename: _step_status(sdoc)
        for sdoc in (projects["text"], projects["image"])
    }

    _round_trip(db_session, projects)

    imported = crud_sdoc.read_by_project(
        db=db_session, project_id=projects["target_project"].id, only_finished=False
    )
    assert {sdoc.filename: _step_status(sdoc) for sdoc in imported} == expected
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
