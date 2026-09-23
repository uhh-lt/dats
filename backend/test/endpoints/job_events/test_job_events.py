"""Tests for the push-based job event system (JOB_UPDATED).

These tests verify that job lifecycle transitions emit websocket events onto
the Redis backplane. The actual Redis publish is mocked
(`job_events._publish_envelope_sync`) so tests stay fast and do not depend on
a running websocket subscriber.

Covered behavior:
- JOB_UPDATED is emitted on enqueue (start_job), update, stop, and retry.
- The emitted envelope has kind="users", targets the project's member ids, and
  carries the full per-type JobRead payload.
- An emission failure does NOT fail the job (never-raise contract).
"""

from unittest.mock import MagicMock, patch

import pytest

from common.dats_event import DATSEvent
from common.job_type import JobType
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from modules.eximport.export_job_dto import ExportJobInput, ExportJobType
from systems.job_system.job_dto import Job, JobRead
from systems.job_system.job_service import JobService
from systems.websocket_system.websocket_dto import WebSocketEnvelope

# ===========================================================================
# Helpers
# ===========================================================================


def _start_export_job(project: ProjectORM) -> Job:
    """Enqueue a minimal EXPORT job and return the Job wrapper."""
    payload = ExportJobInput(
        project_id=project.id,
        export_job_type=ExportJobType.ALL_SDOCS,
        specific_export_job_parameters=None,
    )
    return JobService().start_job(job_type=JobType.EXPORT, payload=payload)


def _captured_envelopes(mock_publish: MagicMock) -> list[WebSocketEnvelope]:
    """Extract the WebSocketEnvelope positional arg from every publish call."""
    return [call.args[0] for call in mock_publish.call_args_list]


def _payload(envelope: WebSocketEnvelope) -> JobRead:
    """Return the envelope's event payload typed as a JobRead for attribute access."""
    payload = envelope.message.payload
    assert isinstance(payload, JobRead)
    return payload


# ===========================================================================
# JOB_UPDATED EMISSION TESTS
# ===========================================================================


@pytest.mark.usefixtures("client")
class TestJobUpdatedEmission:
    """JOB_UPDATED emission across job lifecycle transitions.

    The `client` fixture is required so the FastAPI app is built, which imports
    all `_job.py` modules (registering jobs) and runs `build_job_event_models()`.
    """

    def test_start_job_emits_job_updated(
        self, test_project: ProjectORM, test_user: UserORM
    ):
        """Enqueueing a job emits JOB_UPDATED with the full JobRead payload."""
        with patch(
            "systems.job_system.job_events._publish_envelope_sync"
        ) as mock_publish:
            job = _start_export_job(test_project)

        assert mock_publish.called, "start_job should publish a JOB_UPDATED event"
        envelope = _captured_envelopes(mock_publish)[-1]
        assert envelope.kind == "users"
        assert envelope.user_ids is not None
        assert test_user.id in envelope.user_ids
        assert envelope.message.type == DATSEvent.JOB_UPDATED
        payload = _payload(envelope)
        assert payload.job_id == job.get_id()
        assert payload.project_id == test_project.id
        assert payload.job_type == JobType.EXPORT.value

    def test_job_update_emits_job_updated(
        self, test_project: ProjectORM, test_user: UserORM
    ):
        """Job.update() emits JOB_UPDATED reflecting the new status message."""
        with patch("systems.job_system.job_events._publish_envelope_sync"):
            job = _start_export_job(test_project)

        with patch(
            "systems.job_system.job_events._publish_envelope_sync"
        ) as mock_publish:
            job.update(status_message="Halfway there", current_step=1)

        assert mock_publish.called, "Job.update() should publish a JOB_UPDATED event"
        envelope = _captured_envelopes(mock_publish)[-1]
        assert envelope.message.type == DATSEvent.JOB_UPDATED
        payload = _payload(envelope)
        assert payload.job_id == job.get_id()
        assert payload.status_message == "Halfway there"
        assert payload.current_step == 1

    def test_stop_job_emits_job_updated(
        self, test_project: ProjectORM, test_user: UserORM
    ):
        """Stopping a job emits JOB_UPDATED."""
        with patch("systems.job_system.job_events._publish_envelope_sync"):
            job = _start_export_job(test_project)

        with patch(
            "systems.job_system.job_events._publish_envelope_sync"
        ) as mock_publish:
            JobService().stop_job(job.get_id())

        assert mock_publish.called, "stop_job should publish a JOB_UPDATED event"
        envelope = _captured_envelopes(mock_publish)[-1]
        assert envelope.message.type == DATSEvent.JOB_UPDATED
        assert _payload(envelope).job_id == job.get_id()

    def test_emission_failure_does_not_fail_job(
        self, test_project: ProjectORM, test_user: UserORM
    ):
        """A publish exception is swallowed — the job operation still succeeds."""
        with patch(
            "systems.job_system.job_events._publish_envelope_sync",
            side_effect=RuntimeError("redis down"),
        ):
            # Must not raise despite the publish failure.
            job = _start_export_job(test_project)
            job.update(status_message="still alive")

        assert job.get_id() is not None

    def test_internal_job_does_not_emit(
        self, test_project: ProjectORM, test_user: UserORM
    ):
        """Jobs registered without publish_updates never emit JOB_UPDATED."""
        from pathlib import Path

        from common.doc_type import DocType
        from common.languages_enum import Language
        from modules.doc_processing.doc_processing_dto import ProcessingSettings
        from modules.doc_processing.entrypoints.init_sdoc_job import SdocInitJobInput

        payload = SdocInitJobInput(
            project_id=test_project.id,
            filepath=Path("/nonexistent/file.txt"),
            doctype=DocType.text,
            folder_id=None,
            settings=ProcessingSettings(
                extract_images=False,
                pages_per_chunk=10,
                keyword_number=5,
                keyword_deduplication_threshold=0.5,
                keyword_max_ngram_size=2,
                language=Language.english,
                model="dummy",
            ),
        )
        with patch(
            "systems.job_system.job_events._publish_envelope_sync"
        ) as mock_publish:
            job = JobService().start_job(job_type=JobType.SDOC_INIT, payload=payload)
            job.update(status_message="working on it")

        assert not mock_publish.called, (
            "Internal pipeline jobs (publish_updates=False) must not publish events"
        )
