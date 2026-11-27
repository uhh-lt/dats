from collections.abc import Callable, Generator
from datetime import datetime
from itertools import count
from typing import Any, TypedDict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from common.meta_type_enum import MetaType
from composite_keys_test_utils import (
    TenantRows,
    TwinProjects,
    TwoTenants,
    create_tenant_rows,
    create_twin,
    create_twin_projects,
    create_two_tenants,
)
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from core.prompt.prompt_enum import TaskType
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from dats_test_utils import create_user_client
from feature_test_utils import create_project_with_features
from job_test_utils import store_job
from modules.classifier.classifier_dto import (
    ClassifierInferenceParams,
    ClassifierJobInput,
)
from modules.classifier.classifier_enum import ClassifierModel, ClassifierTask
from modules.concept_over_time_analysis.cota_dto import COTARefinementJobInput
from modules.crawler.crawler_job import CrawlerJobInput
from modules.duplicate_finder.duplicate_finder_job import DuplicateFinderInput
from modules.eximport.export_enum import ExportJobType
from modules.eximport.export_job_dto import ExportJobInput
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_job_dto import ImportJobInput
from modules.llm_assistant.llm_assistant_job_dto import LLMAssistantJobInput
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.perspectives_enum import PerspectivesJobType
from modules.perspectives.perspectives_job_dto import (
    PerspectivesJobInput,
    RefineModelParams,
)
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)
from modules.timeline_analysis.timeline_analysis_enum import TimelineAnalysisType
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import EndpointGeneration


@pytest.fixture(scope="function")
def tenants(db_session, test_user, test_project) -> TwoTenants:
    """
    This fixture sets up two projects with one row of every project-owned table
    each (see `composite_keys_test_utils.TenantRows` for the full inventory):

    - `own`: the rows in the test project.
    - `foreign`: the same rows in the project "Foreign Project" (no features).

    The test user is a member of both projects and annotated in both: the
    annotation document of the test user for "doc_<p>.txt" holds one span, one
    sentence and one bounding box annotation of "Code <p>" and the span group
    "Group <p>".

    Non-obvious derived behavior: because the user is a member of both projects,
    a request may only fail because an id belongs to the other project, never
    because of the membership.
    """
    return create_two_tenants(db_session, user=test_user, project=test_project)


# a valid input of every job type with endpoints, on the rows of a tenant
JOB_INPUTS: dict[str, Callable[[TenantRows, UserORM], JobInputBase]] = {
    "classifier": lambda rows, user: ClassifierJobInput(
        project_id=rows["project"].id,
        task_type=ClassifierTask.INFERENCE,
        model_type=ClassifierModel.DOCUMENT,
        task_parameters=ClassifierInferenceParams(
            task_type=ClassifierTask.INFERENCE,
            classifier_id=rows["classifier"].id,
            sdoc_ids=[rows["sdoc"].id],
            delete_existing_work=False,
        ),
    ),
    "cota_refinement": lambda rows, user: COTARefinementJobInput(
        project_id=rows["project"].id, cota_id=rows["cota"].id
    ),
    "crawler": lambda rows, user: CrawlerJobInput(
        project_id=rows["project"].id,
        urls=[],
        settings=ProcessingSettings(
            extract_images=False,
            pages_per_chunk=1,
            language=Language.english,
            model="default",
        ),
    ),
    "duplicate_finder": lambda rows, user: DuplicateFinderInput(
        project_id=rows["project"].id, max_different_words=0, tag_id=None
    ),
    "export": lambda rows, user: ExportJobInput(
        project_id=rows["project"].id,
        export_job_type=ExportJobType.ALL_SDOCS,
        specific_export_job_parameters=None,
    ),
    "import": lambda rows, user: ImportJobInput(
        project_id=rows["project"].id,
        import_job_type=ImportJobType.CODES,
        user_id=user.id,
        temporary_file_id="none",
        file_name="codes.csv",
    ),
    "llm_assistant": lambda rows, user: LLMAssistantJobInput(
        project_id=rows["project"].id,
        task_type=TaskType.ANNOTATION,
        sdoc_ids=[rows["sdoc"].id],
        model="default",
        prompt_version_id=rows["prompt_version"].id,
        virtual_user_id=rows["virtual_user"].id,
    ),
    "perspectives": lambda rows, user: PerspectivesJobInput(
        project_id=rows["project"].id,
        aspect_id=rows["aspect"].id,
        perspectives_job_type=PerspectivesJobType.REFINE_MODEL,
        parameters=RefineModelParams(
            perspectives_job_type=PerspectivesJobType.REFINE_MODEL
        ),
    ),
    "tag_recommendation": lambda rows, user: TagRecommendationJobInput(
        project_id=rows["project"].id
    ),
}


class PathTenant(TypedDict):
    """What the path ids of the project routes name in one project: the
    `TenantRows`, one job of every job type with endpoints (its id by job type,
    its input from `JOB_INPUTS`, started by the test user) and the user
    "member_<p>@dats.org", a member of only this project. Both clusters of
    "Aspect <p>" have the embedding [1, 0]."""

    rows: TenantRows
    jobs: dict[str, str]
    member: UserORM


def _create_path_tenant(db: Session, rows: TenantRows, user: UserORM) -> PathTenant:
    """Store the jobs (without enqueueing them, so no worker runs them), add the
    member to the project of the rows and embed its clusters."""
    job_types = [
        job_type
        for job_type, job in JobService().job_registry.items()
        if job["generate_endpoints"] != EndpointGeneration.NONE
    ]
    missing = set(job_types) - set(JOB_INPUTS)
    assert not missing, f"add an input of the job types {missing} to JOB_INPUTS"
    project_id = rows["project"].id
    member = crud_user.create(
        db=db,
        create_dto=UserCreate(
            first_name="Member",
            last_name=str(project_id),
            email=f"member_{project_id}@dats.org",
            password="MemberPassword123",
        ),
    )
    crud_project.associate_user(db=db, project_id=project_id, user_id=member.id)
    db.commit()
    for cluster in (rows["cluster"], rows["child_cluster"]):
        crud_cluster_embedding.create(
            WeaviateRepo().get_client(),
            project_id=project_id,
            id=ClusterObjectIdentifier(
                aspect_id=rows["aspect"].id, cluster_id=cluster.id
            ),
            embedding=[1.0, 0.0],
        )
    return {
        "rows": rows,
        "jobs": {
            job_type: store_job(job_type, JOB_INPUTS[job_type](rows, user))
            for job_type in job_types
        },
        "member": member,
    }


@pytest.fixture(scope="function")
def path_tenants(db_session, test_user, tenants: TwoTenants) -> dict[str, PathTenant]:
    """
    This fixture extends `tenants` by the jobs and the member of each project
    (see `PathTenant`): `own` in the test project, `foreign` in "Foreign
    Project".

    Non-obvious derived behavior: the jobs are QUEUED but on no queue, so an
    abort or a retry of them changes nothing (both answer false).
    """
    return {
        tenant: _create_path_tenant(db_session, tenants[tenant], test_user)
        for tenant in ("own", "foreign")
    }


@pytest.fixture(scope="function")
def new_own_path_tenant(
    db_session, test_user, test_project: ProjectORM
) -> Callable[[], PathTenant]:
    """A factory of a `PathTenant` (with the rows of `create_tenant_rows`) in a
    new project "Own Project <n>" (n = 1, 2, ...) of the test user with the
    features of the test project, for a request that deletes what it names."""
    numbers = count(1)

    def create() -> PathTenant:
        project = create_project_with_features(
            db_session,
            test_user,
            title=f"Own Project {next(numbers)}",
            features=list(test_project.enabled_features),
        )
        rows = create_tenant_rows(db_session, project=project, user=test_user)
        return _create_path_tenant(db_session, rows, test_user)

    return create


@pytest.fixture(scope="function")
def non_member_client(app_client, db_session) -> Generator[TestClient, Any, None]:
    """A client authenticated as "nonmember@dats.org", a user who is not a
    member of the test project."""
    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Non",
            last_name="Member",
            email="nonmember@dats.org",
            password="NonPassword123",
        ),
    )
    db_session.commit()
    client = create_user_client(app_client, user)
    yield client
    client.close()


class LoneProject(TypedDict):
    """The rows of `create_tenant_rows` (see `composite_keys_test_utils.TenantRows`)
    in the test project (`project`, `rows`), alone with their ids until
    `create_twin()` creates "Twin Project" with the same features and a copy of
    every row of the test project with the same id (`copy_project_rows`), and
    returns it."""

    project: ProjectORM
    rows: TenantRows
    create_twin: Callable[[], ProjectORM]


@pytest.fixture(scope="function")
def lone_project(db_session, test_user, test_project: ProjectORM) -> LoneProject:
    """
    This fixture sets up the test project with one row of every project-owned
    table (see `LoneProject`); no other project exists until `create_twin()`.

    Non-obvious derived behavior: only the SQL rows are copied, so a read of
    Elasticsearch, Weaviate or files finds nothing in either project.
    """
    rows = create_tenant_rows(db_session, project=test_project, user=test_user)
    db_session.commit()

    return {
        "project": test_project,
        "rows": rows,
        "create_twin": lambda: create_twin(
            db_session, user=test_user, project=test_project
        ),
    }


# --- the CRUD and service reads of two projects with the same ids -----------------


@pytest.fixture(scope="function")
def twin_projects(db_session: Session, test_user, test_project) -> TwinProjects:
    """Two projects that hold the same ids in every project-owned table (see
    TwinProjects)."""
    return create_twin_projects(db_session, user=test_user, project=test_project)


# the timeline concept of a type, over all of its rows
def _timeline_concept(timeline_analysis_type: TimelineAnalysisType) -> dict[str, Any]:
    return {
        "timeline_analysis_type": timeline_analysis_type.value,
        "id": timeline_analysis_type.value,
        "name": timeline_analysis_type.value,
        "description": "",
        "color": "#000000",
        "visible": True,
        "ta_specific_filter": {
            "timeline_analysis_type": timeline_analysis_type.value,
            "filter": {"id": "root", "logic_operator": "and", "items": []},
        },
        "filter_hash": 0,
        "results": [],
    }


class LoneProjectWithTimeline(TypedDict):
    """The rows of `create_tenant_rows` (see TenantRows) in the test project
    (`project`, `rows`) and its date metadata (`date_metadata`), alone with their
    ids until `create_twin()` creates "Twin Project" with the same features and a
    copy of every row of the test project with the same id (`copy_project_rows`),
    and returns it."""

    project: ProjectORM
    rows: TenantRows
    date_metadata: ProjectMetadataORM
    create_twin: Callable[[], ProjectORM]


@pytest.fixture(scope="function")
def lone_project_with_timeline(
    db_session: Session, test_user, test_project
) -> LoneProjectWithTimeline:
    """
    This fixture sets up the test project with one row of every project-owned
    table (see TenantRows), and no other project until `create_twin()`. In
    addition to the rows of TenantRows:

    - the date metadata "date" (text documents), whose value for "doc_<p>.txt"
      is 2024-01-01
    - "Timeline <p>" uses "date" and has one concept per timeline analysis type
      (document, sentence, span and bbox annotations), each without filter and
      without results
    """
    rows = create_tenant_rows(db_session, project=test_project, user=test_user)
    p = test_project.id
    date_metadata = ProjectMetadataORM(
        key="date",
        metatype=MetaType.DATE,
        read_only=False,
        doctype=DocType.text,
        description="",
        project_id=p,
    )
    db_session.add(date_metadata)
    db_session.flush()
    db_session.add(
        SourceDocumentMetadataORM(
            date_value=datetime(2024, 1, 1),
            project_id=p,
            project_metadata_id=date_metadata.id,
            source_document_id=rows["sdoc"].id,
        )
    )
    rows["timeline_analysis"].settings = {"date_metadata_id": date_metadata.id}
    rows["timeline_analysis"].concepts = [
        _timeline_concept(t) for t in TimelineAnalysisType
    ]
    db_session.commit()

    return {
        "project": test_project,
        "rows": rows,
        "date_metadata": date_metadata,
        "create_twin": lambda: create_twin(
            db_session, user=test_user, project=test_project
        ),
    }
