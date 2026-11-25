"""End-to-end runs of the LLM Assistant job (`llm_assistant_job.py`) on several
documents, run in-process by `held_jobs`: the job commits per batch of
documents and a retry continues where the failed attempt stopped. The LLM is
an external service: the tests replace
`LLMRepo.llm_batch_chat` with a fake that classifies the first sentence of
every document as FACT, or fails for chosen documents."""

import time
from collections import Counter

import pytest
import rq
from fastapi.testclient import TestClient
from pydantic import BaseModel
from rq.defaults import DEFAULT_FAILURE_TTL
from rq.timeouts import JobTimeoutException

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationRead,
    SentenceAnnotatorResult,
)
from core.prompt.prompt_enum import TaskType
from job_test_utils import HeldJobs
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
    SentenceAnnotationLLMAssistantJobResult,
)
from modules.llm_assistant.tasks import llm_assistant_document_processor
from modules.llm_assistant.tasks.sentence_annotation_task import (
    SentenceAnnotationTask,
)
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo
from systems.job_system.job_dto import Job, JobRead
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus, JobTiming

from .conftest import TARGET_SENTENCES, JobPromptProject


def _job_url(project: JobPromptProject) -> str:
    return f"/projects/{project['base']['project'].id}/jobs/llm-assistant"


LLMAssistantJobRead = JobRead[LLMAssistantJobInput, LLMAssistantJobOutput]

# the documents of the job, in its order, by a text only their prompts show
TARGET = "target"
EXAMPLE = "example"
NO_MATCH = "no_match"
DOCUMENT_TEXTS = {
    TARGET: TARGET_SENTENCES[0],
    EXAMPLE: "The text names Anna as a person.",
    NO_MATCH: "No selected category applies here.",
}
# the answer of the fake LLM to every message: sentence 1 is a FACT
FACT_ANSWER = '{"data": [{"sent_id": 1, "category": "FACT"}]}'


class FakeLLM:
    """Answers every message with `FACT_ANSWER`, or fails a whole request batch
    that holds a message of a document in `failing`. A message of a document in
    `down` fails alone because the LLM is unavailable (unreachable), one in
    `rejected` fails alone because of the request (e.g. it exceeds the context
    window), and one in `unparseable` gets an answer that cannot be parsed.
    Records the documents of the messages it was asked, in order."""

    def __init__(self) -> None:
        self.failing: set[str] = set()
        self.down: set[str] = set()
        self.rejected: set[str] = set()
        self.unparseable: set[str] = set()
        self.asked: list[str] = []

    def batch_chat(
        self, messages: list[LLMMessage], response_model: type[BaseModel]
    ) -> list[LLMBatchChatResponse]:
        documents = [
            next(
                document
                for document, text in DOCUMENT_TEXTS.items()
                if text in message.user_prompt
            )
            for message in messages
        ]
        self.asked.extend(documents)
        if self.failing.intersection(documents):
            raise RuntimeError("The LLM is down")
        return [self._answer(document, response_model) for document in documents]

    def _answer(
        self, document: str, response_model: type[BaseModel]
    ) -> LLMBatchChatResponse:
        if document in self.down:
            return LLMBatchChatResponse(
                raw=None, error="LLM request failed: unreachable", unavailable=True
            )
        if document in self.rejected:
            return LLMBatchChatResponse(
                raw=None, error="LLM request failed: context window exceeded"
            )
        if document in self.unparseable:
            return LLMBatchChatResponse(
                raw="no answer", error="Failed to parse LLM response"
            )
        return LLMBatchChatResponse(
            raw=FACT_ANSWER, parsed=response_model.model_validate_json(FACT_ANSWER)
        )


def _fake_llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    """Replace the LLM with a `FakeLLM` and process one document per batch."""
    fake = FakeLLM()

    def _batch_chat(
        self: LLMRepo,
        model: str,
        messages: list[LLMMessage],
        response_model: type[BaseModel],
        *,
        capture_raw: bool = False,
    ) -> list[LLMBatchChatResponse]:
        return fake.batch_chat(messages, response_model)

    monkeypatch.setattr(LLMRepo, "llm_batch_chat", _batch_chat)
    monkeypatch.setattr(llm_assistant_document_processor, "DOCUMENT_BATCH_SIZE", 1)
    return fake


def _start_sentence_job(
    client: TestClient, project: JobPromptProject, sdoc_ids: list[int] | None = None
) -> str:
    """Start the ``Sentence classification`` prompt (FACT) on the documents (by
    default the target, example and no-match documents, in this order) as run_a,
    deleting run_a's existing annotations; returns the job id."""
    base = project["base"]
    payload = LLMAssistantJobInput(
        project_id=base["project"].id,
        task_type=TaskType.SENTENCE_ANNOTATION,
        sdoc_ids=(
            sdoc_ids
            if sdoc_ids is not None
            else [
                base["target_sdoc"].id,
                base["example_sdoc"].id,
                base["no_match_sdoc"].id,
            ]
        ),
        model="default",
        prompt_version_id=project["sentence_prompt"].versions[0].id,
        virtual_user_id=base["run_a"].id,
        delete_existing_annotations=True,
    )
    response = client.post(_job_url(project), json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return LLMAssistantJobRead.model_validate(response.json()).job_id


def _read_job(
    client: TestClient, project: JobPromptProject, job_id: str
) -> LLMAssistantJobRead:
    response = client.get(f"{_job_url(project)}/{job_id}")
    assert response.status_code == 200, response.text
    return LLMAssistantJobRead.model_validate(response.json())


def _run_a_annotations(
    client: TestClient, project: JobPromptProject, document: str
) -> list[SentenceAnnotationRead]:
    """The sentence annotations of run_a in a document of `DOCUMENT_TEXTS`, each
    once, by sentence."""
    base = project["base"]
    sdoc_id = {
        TARGET: base["target_sdoc"].id,
        EXAMPLE: base["example_sdoc"].id,
        NO_MATCH: base["no_match_sdoc"].id,
    }[document]
    response = client.get(
        f"/projects/{base['project'].id}/sentence-annotations/by-sentence",
        params={"user_id": base["run_a"].id, "sdoc_id": sdoc_id},
    )
    assert response.status_code == 200, response.text
    result = SentenceAnnotatorResult.model_validate(response.json())
    by_id = {
        annotation.id: annotation
        for annotations in result.sentence_annotations.values()
        for annotation in annotations
    }
    return sorted(by_id.values(), key=lambda a: (a.sentence_id_start, a.id))


def _ranges(annotations: list[SentenceAnnotationRead]) -> list[tuple[int, int, int]]:
    """The (start, end, code) of annotations."""
    return [(a.sentence_id_start, a.sentence_id_end, a.code_id) for a in annotations]


def _count_by_code_id(annotations: list[SentenceAnnotationRead]) -> dict[int, int]:
    """The number of annotations per code."""
    return dict(Counter(a.code_id for a in annotations))


# ===========================================================================
# LLM ASSISTANT JOB RUN TESTS
# ===========================================================================


def test_a_failing_batch_keeps_the_annotations_of_the_earlier_batches(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The LLM fails for the third document (third batch): the job fails, but
    the first two batches committed their FACT annotations, and run_a's old
    annotation of the target was deleted before the first request."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    old_annotation_id = base["run_a_sentence_annotation"].id
    fake = _fake_llm(monkeypatch)
    fake.failing = {NO_MATCH}

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.FAILED
    assert fake.asked == [TARGET, EXAMPLE, NO_MATCH]
    target = _run_a_annotations(client, job_prompt_project, TARGET)
    assert _ranges(target) == [(0, 0, fact_id)]
    assert target[0].id != old_annotation_id
    assert _ranges(_run_a_annotations(client, job_prompt_project, EXAMPLE)) == [
        (0, 0, fact_id)
    ]
    assert _run_a_annotations(client, job_prompt_project, NO_MATCH) == []


def test_a_retry_skips_the_finished_documents_and_returns_the_results_of_all(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The first attempt fails at the third document; the retry asks the LLM for
    the third document only, keeps the annotations the first attempt saved
    (no second "delete existing annotations", no duplicates), and its output
    holds the results of all three documents in the order of the input."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    sdoc_ids = [
        base["target_sdoc"].id,
        base["example_sdoc"].id,
        base["no_match_sdoc"].id,
    ]
    fake = _fake_llm(monkeypatch)
    fake.failing = {NO_MATCH}
    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")
    saved = {
        document: _run_a_annotations(client, job_prompt_project, document)
        for document in (TARGET, EXAMPLE)
    }
    fake.failing = set()
    fake.asked.clear()

    response = client.post(f"{_job_url(job_prompt_project)}/{job_id}/retry")
    assert response.status_code == 200, response.text
    assert response.json() is True
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == [NO_MATCH]
    for document, annotations in saved.items():
        assert _run_a_annotations(client, job_prompt_project, document) == annotations
    no_match = _run_a_annotations(client, job_prompt_project, NO_MATCH)
    assert _ranges(no_match) == [(0, 0, fact_id)]

    assert job.output is not None
    task_result = job.output.specific_task_result
    assert isinstance(task_result, SentenceAnnotationLLMAssistantJobResult)
    assert [result.sdoc_id for result in task_result.results] == sdoc_ids
    assert [result.status for result in task_result.results] == ["finished"] * 3
    assert [result.annotation_count_by_code_id for result in task_result.results] == [
        _count_by_code_id(saved[TARGET]),
        _count_by_code_id(saved[EXAMPLE]),
        _count_by_code_id(no_match),
    ]


def test_the_job_reports_its_progress_once_per_batch(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With one document per batch, the job updates its progress once before
    the first batch and once after each batch, never per document or per LLM
    request batch; every update publishes the job to the project's users."""
    _fake_llm(monkeypatch)
    messages: list[str | None] = []
    update = Job.update

    def _record_update(self: Job, status_message: str | None = None, **kwargs):
        messages.append(status_message)
        update(self, status_message=status_message, **kwargs)

    monkeypatch.setattr(Job, "update", _record_update)

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.FINISHED
    assert [message for message in messages if message is not None] == [
        "Started LLM Assistant!",
        "Started LLMAssistantJob - Sentence Annotation, num docs: 3",
        "Processed 0 of 3 documents",
        "Processed 1 of 3 documents",
        "Processed 2 of 3 documents",
        "Processed 3 of 3 documents",
        "Finished LLMAssistantJob successfully!",
    ]


def _stop_after(monkeypatch: pytest.MonkeyPatch, sdoc_id: int) -> None:
    """Stop the job (`JobService.stop_job`) once it wrote the annotations of the
    document, before its batch commits; the job waits to be interrupted."""
    process_document = SentenceAnnotationTask._process_document

    def _stop_after_document(self, *, context, document):
        result = process_document(self, context=context, document=document)
        if document.sdoc_data.id == sdoc_id:
            current_job = rq.get_current_job()
            assert current_job is not None
            assert JobService().stop_job(current_job.id)
            # the stop interrupts the job while it waits
            time.sleep(30)
        return result

    monkeypatch.setattr(
        SentenceAnnotationTask, "_process_document", _stop_after_document
    )


def test_a_stop_keeps_the_earlier_batches_and_rolls_back_the_batch_in_progress(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The job is stopped (`JobService.stop_job`) once the third batch wrote the
    annotation of its document, before the batch committed: the job ends as
    STOPPED, the first two batches keep their FACT annotations, and the third
    batch is rolled back."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    no_match_id = base["no_match_sdoc"].id
    _fake_llm(monkeypatch)
    _stop_after(monkeypatch, no_match_id)

    job_id = _start_sentence_job(client, job_prompt_project)
    started = time.monotonic()
    held_jobs.run("llm_assistant")

    assert time.monotonic() - started < 20
    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.STOPPED, job.status_message
    assert job.status_message == "The job was stopped"
    for document in (TARGET, EXAMPLE):
        annotations = _run_a_annotations(client, job_prompt_project, document)
        assert _ranges(annotations) == [(0, 0, fact_id)]
    assert _run_a_annotations(client, job_prompt_project, NO_MATCH) == []


def test_a_retry_of_a_stopped_job_continues_after_its_committed_batches(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A job stopped in its third batch can be retried: the retry asks the LLM
    for the third document only and finishes with the results of all three."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    fake = _fake_llm(monkeypatch)
    with monkeypatch.context() as stop:
        _stop_after(stop, base["no_match_sdoc"].id)
        job_id = _start_sentence_job(client, job_prompt_project)
        held_jobs.run("llm_assistant")
    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.STOPPED
    fake.asked.clear()

    response = client.post(f"{_job_url(job_prompt_project)}/{job_id}/retry")
    assert response.status_code == 200, response.text
    assert response.json() is True
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == [NO_MATCH]
    assert _ranges(_run_a_annotations(client, job_prompt_project, NO_MATCH)) == [
        (0, 0, fact_id)
    ]
    assert job.output is not None
    assert [result.status for result in job.output.specific_task_result.results] == [
        "finished"
    ] * 3


def _checkpoint_ttl(job_id: str) -> int:
    """The seconds until the job's checkpoint expires (-1: never, -2: none)."""
    job = JobService().get_job(job_id)
    return job.job.connection.ttl(job._checkpoint_key)


@pytest.mark.parametrize(
    "end,status,saved,ttl",
    [
        # a day after the finish, so a retry continues from it if the worker
        # died before RQ saved the output
        pytest.param("finish", JobStatus.FINISHED, 3, JobTiming.ONE_DAY, id="finish"),
        # the LLM fails for the third document: a retry continues from it
        pytest.param("fail", JobStatus.FAILED, 2, DEFAULT_FAILURE_TTL, id="failure"),
        # stopped in the third batch: a retry continues from it
        pytest.param("stop", JobStatus.STOPPED, 2, DEFAULT_FAILURE_TTL, id="stop"),
    ],
)
def test_the_checkpoint_expires_with_the_job(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
    end: str,
    status: JobStatus,
    saved: int,
    ttl: int,
) -> None:
    """While the job runs, its checkpoint expires a day after the job's
    timeout; once the job ended, a day after the finish, or with the failed
    or stopped job after RQ's failure TTL (one year). It holds the documents of
    the committed batches."""
    fake = _fake_llm(monkeypatch)
    if end == "fail":
        fake.failing = {NO_MATCH}
    if end == "stop":
        _stop_after(monkeypatch, job_prompt_project["base"]["no_match_sdoc"].id)
    running_ttls: list[int] = []
    save_checkpoint = Job.save_checkpoint

    def _record_ttl(self: Job, entries: dict[str, str]) -> None:
        save_checkpoint(self, entries)
        running_ttls.append(_checkpoint_ttl(self.get_id()))

    monkeypatch.setattr(Job, "save_checkpoint", _record_ttl)

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    assert _read_job(client, job_prompt_project, job_id).status == status
    timeout = JobService().get_job(job_id).job.timeout
    assert timeout is not None
    running = timeout + JobTiming.ONE_DAY
    assert len(running_ttls) == saved
    assert all(running - 60 < running_ttl <= running for running_ttl in running_ttls)
    assert len(JobService().get_job(job_id).read_checkpoint()) == saved
    assert ttl - 60 < _checkpoint_ttl(job_id) <= ttl


def _results(job: LLMAssistantJobRead) -> list[tuple[int, str, str]]:
    """The (sdoc id, status, status message) of the job's results, in order."""
    assert job.output is not None
    task_result = job.output.specific_task_result
    assert isinstance(task_result, SentenceAnnotationLLMAssistantJobResult)
    return [
        (result.sdoc_id, result.status, result.status_message)
        for result in task_result.results
    ]


def test_a_deleted_and_a_failing_document_become_error_results(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """All three documents are one batch. The example document is deleted after
    the job started, and the processing of the no-match document raises once it
    wrote its annotation: both become error results, the no-match annotation is
    rolled back, and the target document of the same batch is still saved."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    target_id = base["target_sdoc"].id
    example_id = base["example_sdoc"].id
    no_match_id = base["no_match_sdoc"].id
    fake = _fake_llm(monkeypatch)
    monkeypatch.setattr(llm_assistant_document_processor, "DOCUMENT_BATCH_SIZE", 3)
    process_document = SentenceAnnotationTask._process_document

    def _fail_after_no_match(self, *, context, document):
        result = process_document(self, context=context, document=document)
        if document.sdoc_data.id == no_match_id:
            raise RuntimeError("The processing failed")
        return result

    monkeypatch.setattr(
        SentenceAnnotationTask, "_process_document", _fail_after_no_match
    )
    job_id = _start_sentence_job(client, job_prompt_project)
    response = client.delete(
        f"/projects/{base['project'].id}/source-documents/{example_id}"
    )
    assert response.status_code == 200, response.text

    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == [TARGET, NO_MATCH]
    assert _results(job) == [
        (target_id, "finished", "Sentence annotation successful"),
        (example_id, "error", "The document does not exist"),
        (no_match_id, "error", "The document could not be processed (RuntimeError)"),
    ]
    target = _run_a_annotations(client, job_prompt_project, TARGET)
    assert _ranges(target) == [(0, 0, fact_id)]
    assert _run_a_annotations(client, job_prompt_project, NO_MATCH) == []


def test_a_repeated_document_is_processed_once_and_has_one_result(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The input names the target document twice: the LLM is asked for it once,
    and the output holds one result per document, in the order in which the
    input first names it."""
    base = job_prompt_project["base"]
    target_id = base["target_sdoc"].id
    example_id = base["example_sdoc"].id
    fake = _fake_llm(monkeypatch)

    job_id = _start_sentence_job(
        client, job_prompt_project, sdoc_ids=[target_id, example_id, target_id]
    )
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == [TARGET, EXAMPLE]
    assert [(sdoc_id, status) for sdoc_id, status, _ in _results(job)] == [
        (target_id, "finished"),
        (example_id, "finished"),
    ]


def test_a_job_without_documents_finishes_without_results(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A job on no documents asks the LLM nothing and finishes with no results."""
    fake = _fake_llm(monkeypatch)

    job_id = _start_sentence_job(client, job_prompt_project, sdoc_ids=[])
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == []
    assert _results(job) == []


def test_a_batch_for_which_the_llm_was_unavailable_fails_the_job_before_it_is_saved(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The LLM is unavailable for every request of the third batch (it is
    down): the job fails with the reason before the batch is saved or recorded,
    the first two batches keep their annotations, and a retry continues with
    the third document."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    fake = _fake_llm(monkeypatch)
    fake.down = {NO_MATCH}

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FAILED
    assert job.status_message == (
        "All 1 LLM requests of a batch of documents failed, the LLM may be "
        "unreachable. First error: LLM request failed: unreachable"
    )
    assert len(JobService().get_job(job_id).read_checkpoint()) == 2
    for document in (TARGET, EXAMPLE):
        annotations = _run_a_annotations(client, job_prompt_project, document)
        assert _ranges(annotations) == [(0, 0, fact_id)]

    fake.down = set()
    fake.asked.clear()
    response = client.post(f"{_job_url(job_prompt_project)}/{job_id}/retry")
    assert response.status_code == 200, response.text
    held_jobs.run("llm_assistant")

    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.FINISHED
    assert fake.asked == [NO_MATCH]


def test_a_batch_whose_requests_partly_failed_saves_an_error_result(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """All three documents are one batch and the LLM answers no request of the
    example document: the batch is saved with an error result for it, and the
    job finishes."""
    base = job_prompt_project["base"]
    fake = _fake_llm(monkeypatch)
    monkeypatch.setattr(llm_assistant_document_processor, "DOCUMENT_BATCH_SIZE", 3)
    fake.down = {EXAMPLE}

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert [(sdoc_id, status) for sdoc_id, status, _ in _results(job)] == [
        (base["target_sdoc"].id, "finished"),
        (base["example_sdoc"].id, "error"),
        (base["no_match_sdoc"].id, "finished"),
    ]


def test_a_retry_processes_the_documents_with_an_error_result_again(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The first attempt saves an error result for the example document (its
    answer cannot be parsed) and fails at the third document; the example
    document saved nothing, so the retry asks the LLM for it again, and for the
    third document, and finishes with the results of all three."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    fake = _fake_llm(monkeypatch)
    fake.unparseable = {EXAMPLE}
    fake.failing = {NO_MATCH}
    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")
    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.FAILED
    assert _run_a_annotations(client, job_prompt_project, EXAMPLE) == []
    fake.unparseable = set()
    fake.failing = set()
    fake.asked.clear()

    response = client.post(f"{_job_url(job_prompt_project)}/{job_id}/retry")
    assert response.status_code == 200, response.text
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert fake.asked == [EXAMPLE, NO_MATCH]
    assert _ranges(_run_a_annotations(client, job_prompt_project, EXAMPLE)) == [
        (0, 0, fact_id)
    ]
    assert job.output is not None
    assert [result.status for result in job.output.specific_task_result.results] == [
        "finished"
    ] * 3


def test_a_timeout_while_a_document_is_processed_fails_the_job(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The job runs out of time (RQ's `JobTimeoutException`) while the example
    document is processed: unlike a failing document, the timeout fails the job,
    and the first batch keeps its annotations."""
    base = job_prompt_project["base"]
    fact_id = base["fact_code"].id
    example_id = base["example_sdoc"].id
    _fake_llm(monkeypatch)
    process_document = SentenceAnnotationTask._process_document

    def _time_out_at_example(self, *, context, document):
        if document.sdoc_data.id == example_id:
            raise JobTimeoutException("Task exceeded maximum timeout value")
        return process_document(self, context=context, document=document)

    monkeypatch.setattr(
        SentenceAnnotationTask, "_process_document", _time_out_at_example
    )

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FAILED
    assert job.status_message == "Task exceeded maximum timeout value"
    target = _run_a_annotations(client, job_prompt_project, TARGET)
    assert _ranges(target) == [(0, 0, fact_id)]
    assert _run_a_annotations(client, job_prompt_project, EXAMPLE) == []


def test_a_batch_whose_requests_all_were_rejected_saves_error_results(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every request of the second batch fails because of the request itself
    (e.g. the context window), not because the LLM is unavailable: it would fail
    on every attempt, so the batch is saved with an error result for its
    document and the job finishes."""
    base = job_prompt_project["base"]
    fake = _fake_llm(monkeypatch)
    fake.rejected = {EXAMPLE}

    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert job.output is not None
    assert [
        (result.sdoc_id, result.status, result.status_message)
        for result in job.output.specific_task_result.results
    ] == [
        (base["target_sdoc"].id, "finished", "Sentence annotation successful"),
        (
            base["example_sdoc"].id,
            "error",
            "LLM request failed: context window exceeded",
        ),
        (base["no_match_sdoc"].id, "finished", "Sentence annotation successful"),
    ]


def test_a_job_whose_document_was_deleted_can_be_retried(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The first attempt fails at the third document, which is deleted before
    the retry: the retry is accepted (only the documents that still exist must
    belong to the project), and the deleted document gets an error result."""
    base = job_prompt_project["base"]
    no_match_id = base["no_match_sdoc"].id
    fake = _fake_llm(monkeypatch)
    fake.failing = {NO_MATCH}
    job_id = _start_sentence_job(client, job_prompt_project)
    held_jobs.run("llm_assistant")
    assert _read_job(client, job_prompt_project, job_id).status == JobStatus.FAILED
    response = client.delete(
        f"/projects/{base['project'].id}/source-documents/{no_match_id}"
    )
    assert response.status_code == 200, response.text
    fake.failing = set()

    response = client.post(f"{_job_url(job_prompt_project)}/{job_id}/retry")
    assert response.status_code == 200, response.text
    assert response.json() is True
    held_jobs.run("llm_assistant")

    job = _read_job(client, job_prompt_project, job_id)
    assert job.status == JobStatus.FINISHED, job.status_message
    assert job.output is not None
    assert [
        (result.sdoc_id, result.status, result.status_message)
        for result in job.output.specific_task_result.results
    ] == [
        (base["target_sdoc"].id, "finished", "Sentence annotation successful"),
        (base["example_sdoc"].id, "finished", "Sentence annotation successful"),
        (no_match_id, "error", "The document does not exist"),
    ]
