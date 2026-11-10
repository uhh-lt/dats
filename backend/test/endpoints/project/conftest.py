from typing import Generator
from unittest.mock import patch

import pytest

from common.job_type_enum import JobType
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from experiment_test_utils import RunUserProject, create_run_user_project
from feature_test_utils import FeatureProject, create_feature_project
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService


@pytest.fixture(scope="function")
def run_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject`."""
    return create_run_user_project(db_session, test_user, test_project)


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables all features and has no documents):

    - project: "Feature Project" of `test_user`, without any enabled feature
    - text_done: text document "text_done.txt"; the steps of a project without
      features are finished (extract_html, text_extraction,
      text_language_detection, text_spacy, text_html_mapping), all other steps
      are not planned (NULL)
    - text_running: text document "text_running.txt"; extract_html and
      text_extraction are finished, text_language_detection, text_spacy and
      text_html_mapping are processing, all other steps are not planned
    - image: image document "image.png"; image_metadata_extraction and
      image_thumbnail are finished, all other steps are not planned (no caption,
      so no text steps)

    Non-obvious derived behavior:

    - A feature's steps include the core steps it needs: keyword statistics on
      text needs extract_html, text_extraction, text_language_detection and
      text_keywords (not text_spacy, keywords need no tokens), so
      text_running misses text_language_detection.
    - Features that need text apply to the two text documents only; image
      features (object detection, image captions, image similarity search) to
      the image only.
    """
    return create_feature_project(db_session, test_user)


@pytest.fixture(scope="function")
def started_jobs() -> Generator[list[tuple[JobType, JobInputBase]], None, None]:
    """Captures the jobs the API starts instead of enqueueing them, so a feature
    activation does not run the preprocessing."""
    started: list[tuple[JobType, JobInputBase]] = []

    def _start_job(job_type: JobType, payload: JobInputBase, priority=None) -> None:
        started.append((job_type, payload))

    with patch.object(JobService, "start_job", side_effect=_start_job):
        yield started
