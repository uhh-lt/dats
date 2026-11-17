"""The feature keyword statistics sets up the project metadata key "keywords":
on project creation with the feature, on Enable (safe to run twice) and, for a
project whose key is missing, in the keywords step."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from common.meta_type_enum import MetaType
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_dto import ProjectCreate, ProjectRead
from feature_test_utils import SDOC_SENTENCES, FeaturelessProject, feature_named
from job_test_utils import HeldJobs
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivation
from text_steps_test_utils import run_step_handler

FEATURE = "keyword_statistics"
KEY = "keywords"
ALL_DOCTYPES = {DocType.text, DocType.image, DocType.audio, DocType.video}

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    language=Language.english,
    model="default",
)


def _keyword_keys(db: Session, project_id: int) -> dict[DocType, MetaType]:
    """The metatype of the project's metadata key "keywords" per doctype."""
    db.expire_all()
    return {
        DocType(pm.doctype): MetaType(pm.metatype)
        for pm in crud_project_meta.read_by_project_and_key(
            db=db, project_id=project_id, key=KEY
        )
    }


def test_create_project_creates_the_keywords_key_only_with_the_feature(
    client: TestClient, db_session: Session
):
    """A project created with keyword statistics gets the read-only list key
    "keywords" for every doctype; a project created without it gets none."""
    responses = {
        name: client.put(
            "/project",
            json=ProjectCreate(
                title=name, description="", enabled_features=features
            ).model_dump(mode="json"),
        )
        for name, features in (("with", [FEATURE]), ("without", []))
    }

    for response in responses.values():
        assert response.status_code == 200, response.text
    with_id = ProjectRead.model_validate(responses["with"].json()).id
    without_id = ProjectRead.model_validate(responses["without"].json()).id
    assert _keyword_keys(db_session, with_id) == dict.fromkeys(
        ALL_DOCTYPES, MetaType.LIST
    )
    assert _keyword_keys(db_session, without_id) == {}


def test_enable_creates_the_keywords_key_and_its_set_up_is_safe_to_run_twice(
    client: TestClient,
    db_session: Session,
    featureless_project: FeaturelessProject,
    held_jobs: HeldJobs,
):
    """Enable creates the key for every doctype, with a value row for the
    existing text document; running the feature's set-up again (as Enable
    after a Disable does) creates no second key."""
    project_id = featureless_project["project"].id
    sdoc_id = featureless_project["sdoc"].id
    assert _keyword_keys(db_session, project_id) == {}

    response = client.post(
        f"/feature/project/{project_id}/{FEATURE}/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 200, response.text
    assert _keyword_keys(db_session, project_id) == dict.fromkeys(
        ALL_DOCTYPES, MetaType.LIST
    )
    value = crud_sdoc_meta.read_by_sdoc_and_key(db=db_session, sdoc_id=sdoc_id, key=KEY)
    assert value.list_value in (None, [])

    set_up = feature_named(FEATURE).set_up
    assert set_up is not None
    set_up(db_session, project_id)
    db_session.commit()
    assert len(
        crud_project_meta.read_by_project_and_key(
            db=db_session, project_id=project_id, key=KEY
        )
    ) == len(ALL_DOCTYPES)


def test_keywords_step_creates_a_missing_key_of_its_doctype(
    db_session: Session, featureless_project: FeaturelessProject
):
    """The keywords step of a document whose project has no key "keywords"
    (set up before the feature created it) creates the key of its doctype and
    stores the keywords instead of failing."""
    project_id = featureless_project["project"].id
    sdoc_id = featureless_project["sdoc"].id

    run_step_handler(
        "keywords",
        {
            "project_id": project_id,
            "sdoc_id": sdoc_id,
            "settings": SETTINGS.model_dump(mode="json"),
            "doctype": "text",
            "text": " ".join(SDOC_SENTENCES),
            "language": "en",
        },
    )

    assert _keyword_keys(db_session, project_id) == {DocType.text: MetaType.LIST}
    keywords = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db_session, sdoc_id=sdoc_id, key=KEY
    ).list_value
    assert keywords
