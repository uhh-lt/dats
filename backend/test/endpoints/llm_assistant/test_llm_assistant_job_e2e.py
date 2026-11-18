"""End-to-end runs of the LLM Assistant job (`llm_assistant_job.py`) on several
documents, run in-process by `held_jobs`: the job commits per batch of
documents. The LLM is an external service: the tests replace
`LLMRepo.llm_batch_chat` with a fake that classifies the first sentence of
every document as FACT, or fails for chosen documents."""

import time

import pytest
import rq
from fastapi.testclient import TestClient
from pydantic import BaseModel

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationRead,
    SentenceAnnotatorResult,
)
from core.prompt.prompt_enum import TaskType
from job_test_utils import HeldJobs
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
)
from modules.llm_assistant.tasks import llm_assistant_document_processor
from modules.llm_assistant.tasks.sentence_annotation_task import (
    SentenceAnnotationTask,
)
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo
from systems.job_system.job_dto import JobRead
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus

from .conftest import TARGET_SENTENCES, JobPromptProject

LLM_ASSISTANT_JOB_URL = "/llm_assistant/llm_assistant"
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
    that holds a message of a document in `failing`. Records the documents of
    the messages it was asked, in order."""

    def __init__(self) -> None:
        self.failing: set[str] = set()
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
        return [
            LLMBatchChatResponse(
                raw=FACT_ANSWER,
                parsed=response_model.model_validate_json(FACT_ANSWER),
            )
            for _ in messages
        ]


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


def _start_sentence_job(client: TestClient, project: JobPromptProject) -> str:
    """Start the ``Sentence classification`` prompt (FACT) on the target, example
    and no-match documents, in this order, as run_a, deleting run_a's existing
    annotations; returns the job id."""
    base = project["base"]
    payload = LLMAssistantJobInput(
        project_id=base["project"].id,
        task_type=TaskType.SENTENCE_ANNOTATION,
        sdoc_ids=[
            base["target_sdoc"].id,
            base["example_sdoc"].id,
            base["no_match_sdoc"].id,
        ],
        model="default",
        prompt_version_id=project["sentence_prompt"].versions[0].id,
        virtual_user_id=base["run_a"].id,
        delete_existing_annotations=True,
    )
    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return LLMAssistantJobRead.model_validate(response.json()).job_id


def _read_job(client: TestClient, job_id: str) -> LLMAssistantJobRead:
    response = client.get(f"{LLM_ASSISTANT_JOB_URL}/{job_id}")
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
    response = client.get(f"/sentence/sdoc/{sdoc_id}/user/{base['run_a'].id}")
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

    assert _read_job(client, job_id).status == JobStatus.FAILED
    assert fake.asked == [TARGET, EXAMPLE, NO_MATCH]
    target = _run_a_annotations(client, job_prompt_project, TARGET)
    assert _ranges(target) == [(0, 0, fact_id)]
    assert target[0].id != old_annotation_id
    assert _ranges(_run_a_annotations(client, job_prompt_project, EXAMPLE)) == [
        (0, 0, fact_id)
    ]
    assert _run_a_annotations(client, job_prompt_project, NO_MATCH) == []


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
    _fake_llm(monkeypatch)
    _stop_after(monkeypatch, base["no_match_sdoc"].id)

    job_id = _start_sentence_job(client, job_prompt_project)
    started = time.monotonic()
    held_jobs.run("llm_assistant")

    assert time.monotonic() - started < 20
    job = _read_job(client, job_id)
    assert job.status == JobStatus.STOPPED, job.status_message
    assert job.status_message == "The job was stopped"
    for document in (TARGET, EXAMPLE):
        annotations = _run_a_annotations(client, job_prompt_project, document)
        assert _ranges(annotations) == [(0, 0, fact_id)]
    assert _run_a_annotations(client, job_prompt_project, NO_MATCH) == []
