import time

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from core.prompt_template.prompt_template_defaults import DEFAULT_PROMPTS
from core.prompt_template.prompt_template_dto import (
    PromptSettings,
    PromptTemplateSnapshot,
)
from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptLanguage,
    TaskType,
)
from core.prompt_template.prompt_template_specs import OUTPUT_FORMAT_SPECS
from core.user.user_orm import UserORM
from modules.llm_assistant.llm_assistant_enum import ApproachType
from modules.llm_assistant.llm_assistant_job_dto import (
    ANNOTATING_TASK_TYPES,
    AnnotationLLMAssistantJobResult,
    LLMAssistantJobInput,
    LLMAssistantJobOutput,
    MetadataExtractionLLMAssistantJobResult,
    SentenceAnnotationLLMAssistantJobResult,
    TaggingLLMAssistantJobResult,
)
from systems.job_system.job_dto import JobRead
from systems.job_system.job_system_enum import JobStatus

from .conftest import JobPromptProject, prompt_code

LLM_ASSISTANT_JOB_URL = "/llm_assistant/llm_assistant"
LLMAssistantJobRead = JobRead[LLMAssistantJobInput, LLMAssistantJobOutput]
# six tokens per chunk with an overlap of three: the target document becomes
# several chunks and "Alice" is part of the first two
SMALL_CHUNKS = PromptSettings(chunk_size_tokens=6, chunk_overlap_tokens=3)


def _wait_for_status(
    client: TestClient,
    job_id: str,
    expected_status: JobStatus,
    *,
    timeout: float = 300.0,
    poll_interval: float = 1,
) -> LLMAssistantJobRead:
    """Poll one assistant job until the expected or another terminal status occurs."""
    deadline = time.monotonic() + timeout
    terminal_statuses = {
        JobStatus.FINISHED,
        JobStatus.FAILED,
        JobStatus.STOPPED,
        JobStatus.CANCELED,
    }
    while True:
        response = client.get(f"{LLM_ASSISTANT_JOB_URL}/{job_id}")
        assert response.status_code == 200, response.text
        job = LLMAssistantJobRead.model_validate(response.json())
        if job.status == expected_status:
            return job
        if job.status in terminal_statuses:
            pytest.fail(
                f"LLM assistant job {job_id} ended with status {job.status.value}; "
                f"expected {expected_status.value}: {job.status_message}"
            )
        if time.monotonic() > deadline:
            pytest.fail(
                f"LLM assistant job {job_id} did not reach {expected_status.value} "
                f"within {timeout}s (last status: {job.status.value}, "
                f"message: {job.status_message})"
            )
        time.sleep(poll_interval)


def _start_job(
    client: TestClient, payload: LLMAssistantJobInput
) -> LLMAssistantJobRead:
    """Start a typed assistant job and validate its initial endpoint response."""
    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    job = LLMAssistantJobRead.model_validate(response.json())
    assert job.job_type == "llm_assistant"
    assert job.project_id == payload.project_id
    assert job.input == payload
    assert job.status in {
        JobStatus.QUEUED,
        JobStatus.STARTED,
        JobStatus.FINISHED,
        JobStatus.FAILED,
    }
    return job


def _version_payload(
    project: JobPromptProject,
    *,
    task_type: TaskType,
    version_id: int,
    model: str = "default",
) -> LLMAssistantJobInput:
    """A job on the target document that runs a stored prompt template version."""
    base = project["base"]
    return LLMAssistantJobInput(
        project_id=base["project"].id,
        task_type=task_type,
        sdoc_ids=[base["target_sdoc"].id],
        model=model,
        prompt_template_version_id=version_id,
        annotator_id=(base["run_a"].id if task_type in ANNOTATING_TASK_TYPES else None),
        delete_existing_annotations=True,
    )


def _tagging_payload(
    project: JobPromptProject, *, model: str = "default"
) -> LLMAssistantJobInput:
    """A tagging job with the ``Tagging`` template (tags People and Other)."""
    return _version_payload(
        project,
        task_type=TaskType.TAGGING,
        version_id=project["tagging_template"].versions[0].id,
        model=model,
    )


def _draft(
    project: JobPromptProject,
    *,
    output_format: OutputFormat,
    unit: DocumentUnit,
    is_fewshot: bool,
) -> PromptTemplateSnapshot:
    """The English default prompt of a format with another unit and the test codes.

    Span prompts select PERSON (few-shot: the PERSON examples), sentence prompts
    select FACT (few-shot: the FACT examples). Chunks are small.
    """
    base = project["base"]
    spec = OUTPUT_FORMAT_SPECS[output_format]
    is_sentence = output_format == OutputFormat.SENTENCES
    default_document = f"<document:{spec.default_document_unit.value}>"
    return PromptTemplateSnapshot(
        task_type=spec.task_type,
        language=PromptLanguage.EN,
        prompt=DEFAULT_PROMPTS[output_format][PromptLanguage.EN].replace(
            default_document, f"<document:{unit.value}>"
        ),
        settings=SMALL_CHUNKS,
        codes=[prompt_code(base["fact_code" if is_sentence else "person_code"])],
        examples=(
            (project["sentence_examples"] if is_sentence else project["span_examples"])
            if is_fewshot
            else []
        ),
    )


def _draft_payload(
    project: JobPromptProject, draft: PromptTemplateSnapshot
) -> LLMAssistantJobInput:
    """A job on the target document that runs an unsaved prompt."""
    base = project["base"]
    return LLMAssistantJobInput(
        project_id=base["project"].id,
        task_type=draft.task_type,
        sdoc_ids=[base["target_sdoc"].id],
        model="default",
        draft=draft,
        annotator_id=(
            base["run_a"].id if draft.task_type in ANNOTATING_TASK_TYPES else None
        ),
        delete_existing_annotations=True,
    )


def _expected_approach(is_fewshot: bool) -> ApproachType:
    """The approach of a run, decided by the examples of its prompt."""
    if is_fewshot:
        return ApproachType.LLM_FEW_SHOT
    return ApproachType.LLM_ZERO_SHOT


# ===========================================================================
# START/GET LLM ASSISTANT JOB (/llm_assistant/llm_assistant) TESTS
# ===========================================================================


# --- A. real LLM runs ---------------------------------------------------------------
# These tests call the LLM provider configured in backend/.env.


@pytest.mark.llm
def test_tagging_job_returns_current_and_exact_suggested_tags(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """A stored tagging version classifies the target (names Alice) as People."""
    base = job_prompt_project["base"]
    started = _start_job(client, _tagging_payload(job_prompt_project))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.task_type == TaskType.TAGGING
    assert finished.output.approach_type == ApproachType.LLM_ZERO_SHOT
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, TaggingLLMAssistantJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.sdoc_id == base["target_sdoc"].id
    assert result.current_tag_ids == [base["other_tag"].id]
    assert result.suggested_tag_ids == [base["people_tag"].id]
    assert result.reasoning


@pytest.mark.llm
def test_metadata_job_extracts_all_supported_value_types(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """A stored metadata version extracts string, number, date, boolean and list values."""
    base = job_prompt_project["base"]
    payload = _version_payload(
        job_prompt_project,
        task_type=TaskType.METADATA_EXTRACTION,
        version_id=job_prompt_project["metadata_template"].versions[0].id,
    )
    started = _start_job(client, payload)
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.task_type == TaskType.METADATA_EXTRACTION
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, MetadataExtractionLLMAssistantJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.sdoc_id == base["target_sdoc"].id
    assert len(result.current_metadata) == 5
    values = {
        item.project_metadata.key: item.get_value_serializable()
        for item in result.suggested_metadata
    }
    assert values == {
        "author": "Alice",
        "year": 2024,
        "published": "2024-01-15",
        "reviewed": True,
        "topics": ["solar", "energy"],
    }


@pytest.mark.llm
@pytest.mark.parametrize(
    "output_format,unit,is_fewshot",
    [
        pytest.param(
            output_format,
            unit,
            is_fewshot,
            id=f"{output_format.value}-{unit.value}-{'few' if is_fewshot else 'zero'}-shot",
        )
        # Inline tags and quotes with context, for every unit, zero- and few-shot.
        for output_format in (OutputFormat.INLINE, OutputFormat.CONTEXT)
        for unit in DocumentUnit
        for is_fewshot in (False, True)
    ],
)
def test_span_annotation_job_covers_all_formats_units_and_approaches(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    output_format: OutputFormat,
    unit: DocumentUnit,
    is_fewshot: bool,
) -> None:
    """Every span variant persists one deduplicated PERSON suggestion for Alice.

    The existing annotations of the selected virtual annotator (run A) are
    deleted first, the other virtual annotator's (run B) stay; the examples of
    the prompt decide the approach.
    """
    base = job_prompt_project["base"]
    draft = _draft(
        job_prompt_project,
        output_format=output_format,
        unit=unit,
        is_fewshot=is_fewshot,
    )
    started = _start_job(client, _draft_payload(job_prompt_project, draft))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    approach_type = _expected_approach(is_fewshot)
    assistant_user_id = base["run_a"].id
    assert finished.output is not None
    assert finished.output.task_type == TaskType.ANNOTATION
    assert finished.output.approach_type == approach_type
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, AnnotationLLMAssistantJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.raw_response is None
    assert result.sdoc_id == base["target_sdoc"].id
    suggestions = [
        (annotation.text, annotation.code_id, annotation.user_id)
        for annotation in result.suggested_annotations
    ]
    assert suggestions == [("Alice", base["person_code"].id, assistant_user_id)]
    run_a_alice = client.get(f"/span/{base['run_a_span_annotation'].id}")
    assert run_a_alice.status_code == 403, run_a_alice.text  # deleted
    run_b_alice = client.get(f"/span/{base['run_b_span_annotation'].id}")
    assert run_b_alice.status_code == 200, run_b_alice.text


@pytest.mark.llm
@pytest.mark.parametrize(
    "unit,is_fewshot",
    [
        pytest.param(
            unit, is_fewshot, id=f"{unit.value}-{'few' if is_fewshot else 'zero'}-shot"
        )
        # Every unit, zero- and few-shot.
        for unit in DocumentUnit
        for is_fewshot in (False, True)
    ],
)
def test_sentence_annotation_job_covers_all_units_and_approaches(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    unit: DocumentUnit,
    is_fewshot: bool,
) -> None:
    """Sentence jobs persist valid, maximal FACT ranges without duplicate suggestions.

    Whatever the LLM classifies, consecutive FACT sentences are merged into one
    range, so two FACT ranges never touch; sentences shown by several messages
    (sentences, overlapping chunks) are merged as well.
    """
    base = job_prompt_project["base"]
    draft = _draft(
        job_prompt_project,
        output_format=OutputFormat.SENTENCES,
        unit=unit,
        is_fewshot=is_fewshot,
    )
    started = _start_job(client, _draft_payload(job_prompt_project, draft))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    approach_type = _expected_approach(is_fewshot)
    assistant_user_id = base["run_a"].id
    assert finished.output is not None
    assert finished.output.task_type == TaskType.SENTENCE_ANNOTATION
    assert finished.output.approach_type == approach_type
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, SentenceAnnotationLLMAssistantJobResult)
    assert len(task_result.results) == 1
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.raw_response is None
    assert result.sdoc_id == base["target_sdoc"].id
    suggestions = [
        (
            annotation.sentence_id_start,
            annotation.sentence_id_end,
            annotation.code_id,
            annotation.user_id,
        )
        for annotation in result.suggested_annotations
    ]
    assert suggestions

    ranges = [(start, end) for start, end, _, _ in suggestions]
    assert ranges == sorted(set(ranges))

    num_sentences = len(base["target_sdoc"].data.sentences)
    covered_sentence_ids: list[int] = []
    for start, end, code_id, user_id in suggestions:
        assert 0 <= start <= end < num_sentences
        assert code_id == base["fact_code"].id
        assert user_id == assistant_user_id
        covered_sentence_ids.extend(range(start, end + 1))

    assert len(covered_sentence_ids) == len(set(covered_sentence_ids))
    for (_, previous_end), (next_start, _) in zip(ranges, ranges[1:]):
        assert next_start > previous_end + 1, f"FACT ranges not merged: {ranges}"


@pytest.mark.llm
def test_sentence_annotation_job_runs_a_stored_version(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """The ``Sentence classification`` version (FACT, no examples) runs zero-shot."""
    base = job_prompt_project["base"]
    payload = _version_payload(
        job_prompt_project,
        task_type=TaskType.SENTENCE_ANNOTATION,
        version_id=job_prompt_project["sentence_template"].versions[0].id,
    )
    started = _start_job(client, payload)
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    assert finished.output is not None
    assert finished.output.approach_type == ApproachType.LLM_ZERO_SHOT
    task_result = finished.output.specific_task_result
    assert isinstance(task_result, SentenceAnnotationLLMAssistantJobResult)
    result = task_result.results[0]
    assert result.status == "finished", result.model_dump_json(indent=2)
    assert result.suggested_annotations
    assert all(
        annotation.code_id == base["fact_code"].id
        and annotation.user_id == base["run_a"].id
        for annotation in result.suggested_annotations
    )


# --- B. prompts a job rejects -------------------------------------------------------
# The worker resolves and checks the prompt before it calls the LLM, so these jobs
# fail without an LLM call.


@pytest.mark.parametrize(
    "template_key,task_type",
    [
        # A version of the unauthorized project cannot be used in the main project.
        pytest.param("foreign_template", TaskType.ANNOTATION, id="other-project"),
        # A tagging version cannot run a sentence annotation job.
        pytest.param("tagging_template", TaskType.SENTENCE_ANNOTATION, id="other-task"),
    ],
)
def test_job_fails_with_a_version_of_another_project_or_task(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    template_key: str,
    task_type: TaskType,
) -> None:
    """The job checks that the version belongs to its project and task."""
    template = job_prompt_project[template_key]  # type: ignore[literal-required]
    version_id = template.versions[0].id
    started = _start_job(
        client,
        _version_payload(
            job_prompt_project, task_type=task_type, version_id=version_id
        ),
    )
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert failed.output is None
    assert f"Prompt version {version_id} cannot be used" in (
        failed.status_message or ""
    )


def test_job_fails_with_a_draft_that_selects_no_codes(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """A valid prompt without codes can be saved but not run."""
    draft = _draft(
        job_prompt_project,
        output_format=OutputFormat.INLINE,
        unit=DocumentUnit.WHOLE,
        is_fewshot=False,
    ).model_copy(update={"codes": []})
    started = _start_job(client, _draft_payload(job_prompt_project, draft))
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert "The prompt selects no codes" in (failed.status_message or "")


def test_job_fails_with_a_default_version_that_selects_no_tags(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """The default templates of a new project select nothing, so they cannot run."""
    started = _start_job(
        client,
        _version_payload(
            job_prompt_project,
            task_type=TaskType.TAGGING,
            version_id=job_prompt_project["empty_tagging_version_id"],
        ),
    )
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert "The prompt selects no tags" in (failed.status_message or "")


def test_job_fails_with_a_draft_that_breaks_the_block_rules(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """Drafts are validated by the job like saved templates."""
    draft = _draft(
        job_prompt_project,
        output_format=OutputFormat.INLINE,
        unit=DocumentUnit.WHOLE,
        is_fewshot=False,
    )
    draft = draft.model_copy(
        update={"prompt": draft.prompt.replace("<document:whole>", "")}
    )
    started = _start_job(client, _draft_payload(job_prompt_project, draft))
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert "must contain exactly one document block" in (failed.status_message or "")


# --- C. invalid job payloads (HTTP 422 contracts) -----------------------------------


@pytest.mark.parametrize(
    "payload_update,expected_fragment",
    [
        # The task accepts only declared task enum values.
        pytest.param({"task_type": "UNKNOWN"}, "task_type", id="unknown-task"),
        # A job needs documents.
        pytest.param({"sdoc_ids": None}, "sdoc_ids", id="missing-sdoc-ids"),
        # A job needs a model.
        pytest.param({"model": None}, "model", id="missing-model"),
        # Both prompt sources are contradictory.
        pytest.param(
            {"draft": "tagging-draft"},
            "Exactly one of prompt_template_version_id and draft",
            id="version-and-draft",
        ),
        # One prompt source is required.
        pytest.param(
            {"prompt_template_version_id": None},
            "Exactly one of prompt_template_version_id and draft",
            id="neither-version-nor-draft",
        ),
        # A draft must be a prompt of the job's task.
        pytest.param(
            {"prompt_template_version_id": None, "draft": "span-draft"},
            "The draft must be a prompt of the job's task",
            id="draft-of-another-task",
        ),
    ],
)
def test_job_start_rejects_malformed_payloads(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    payload_update: dict[str, object],
    expected_fragment: str,
) -> None:
    """Malformed tasks, missing fields and wrong prompt sources return HTTP 422.

    The tagging job is the base payload; ``tagging-draft`` and ``span-draft``
    stand for a valid tagging and span annotation draft.
    """
    drafts = {
        "tagging-draft": PromptTemplateSnapshot(
            task_type=TaskType.TAGGING,
            language=PromptLanguage.EN,
            prompt=DEFAULT_PROMPTS[OutputFormat.TAGS][PromptLanguage.EN],
        ),
        "span-draft": _draft(
            job_prompt_project,
            output_format=OutputFormat.INLINE,
            unit=DocumentUnit.WHOLE,
            is_fewshot=False,
        ),
    }
    payload = _tagging_payload(job_prompt_project).model_dump(mode="json")
    for key, value in payload_update.items():
        payload[key] = (
            drafts[value].model_dump(mode="json")
            if isinstance(value, str) and value in drafts
            else value
        )
    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload)
    assert response.status_code == 422, response.text
    assert expected_fragment in response.text


def test_job_start_and_project_list_reject_foreign_project(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """Both job creation and project listing require project membership."""
    foreign_project = job_prompt_project["base"]["foreign_project"]
    payload = _tagging_payload(job_prompt_project).model_copy(
        update={"project_id": foreign_project.id}
    )
    start_response = client.post(
        LLM_ASSISTANT_JOB_URL, json=payload.model_dump(mode="json")
    )
    assert start_response.status_code == 403, start_response.text

    list_response = client.get(f"{LLM_ASSISTANT_JOB_URL}/project/{foreign_project.id}")
    assert list_response.status_code == 403, list_response.text


@pytest.mark.parametrize(
    "sdoc_key",
    [
        # a document of a project the user is not a member of
        pytest.param("foreign_sdoc", id="document-of-another-project"),
        # a document id that does not exist
        pytest.param(None, id="nonexistent-document"),
    ],
)
def test_job_start_rejects_documents_outside_the_project(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    sdoc_key: str | None,
) -> None:
    """A member of the job's project cannot run the assistant on documents that do
    not belong to the project: the start returns HTTP 400 and no job is
    enqueued."""
    base = job_prompt_project["base"]
    sdoc_id = base["foreign_sdoc"].id if sdoc_key else 999_999
    payload = _tagging_payload(job_prompt_project).model_copy(
        update={"sdoc_ids": [base["target_sdoc"].id, sdoc_id]}
    )

    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload.model_dump(mode="json"))

    assert response.status_code == 400, response.text
    assert f"The source documents [{sdoc_id}] do not belong to project" in response.text
    list_response = client.get(f"{LLM_ASSISTANT_JOB_URL}/project/{base['project'].id}")
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []


@pytest.mark.parametrize(
    "task_type",
    [
        # span annotation writes annotations
        pytest.param(TaskType.ANNOTATION, id="span-annotation"),
        # sentence annotation writes annotations
        pytest.param(TaskType.SENTENCE_ANNOTATION, id="sentence-annotation"),
    ],
)
def test_job_start_requires_an_annotator_for_annotation_tasks(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    task_type: TaskType,
) -> None:
    """Annotation tasks need the virtual annotator to annotate as (HTTP 422)."""
    payload = _version_payload(
        job_prompt_project,
        task_type=TaskType.SENTENCE_ANNOTATION,
        version_id=job_prompt_project["sentence_template"].versions[0].id,
    ).model_dump(mode="json")
    payload.update({"task_type": task_type.value, "annotator_id": None})
    if task_type == TaskType.ANNOTATION:
        payload["prompt_template_version_id"] = None
        payload["draft"] = _draft(
            job_prompt_project,
            output_format=OutputFormat.INLINE,
            unit=DocumentUnit.WHOLE,
            is_fewshot=False,
        ).model_dump(mode="json")

    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload)

    assert response.status_code == 422, response.text
    assert "need the virtual annotator to annotate as" in response.text


@pytest.mark.parametrize(
    "annotator",
    [
        # the LLM Assistant never writes into a human user's annotations
        pytest.param("test_user", id="human-user"),
        # a virtual annotator of another project
        pytest.param("foreign_run", id="foreign-virtual-annotator"),
        # a user id that does not exist
        pytest.param(None, id="nonexistent-user"),
    ],
)
def test_job_start_rejects_annotators_that_are_no_virtual_annotator_of_the_project(
    client: TestClient,
    job_prompt_project: JobPromptProject,
    test_user: UserORM,
    annotator: str | None,
) -> None:
    """The job only annotates as a virtual annotator of its project: other
    annotators are rejected before the job is enqueued."""
    base = job_prompt_project["base"]
    annotator_id = {
        "test_user": test_user.id,
        "foreign_run": base["foreign_run"].id,
        None: 999_999,
    }[annotator]
    payload = _version_payload(
        job_prompt_project,
        task_type=TaskType.SENTENCE_ANNOTATION,
        version_id=job_prompt_project["sentence_template"].versions[0].id,
    ).model_copy(update={"annotator_id": annotator_id})

    response = client.post(LLM_ASSISTANT_JOB_URL, json=payload.model_dump(mode="json"))

    assert response.status_code in (400, 404), response.text
    list_response = client.get(f"{LLM_ASSISTANT_JOB_URL}/project/{base['project'].id}")
    assert list_response.status_code == 200, list_response.text
    assert list_response.json() == []


# ===========================================================================
# JOB MANAGEMENT (/llm_assistant/llm_assistant/...) TESTS
# ===========================================================================


@pytest.mark.llm
def test_finished_job_can_be_read_listed_but_not_aborted_or_retried(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """Get, project-list, abort and retry expose consistent finished-job state."""
    project_id = job_prompt_project["base"]["project"].id
    started = _start_job(client, _tagging_payload(job_prompt_project))
    finished = _wait_for_status(client, started.job_id, JobStatus.FINISHED)

    list_response = client.get(f"{LLM_ASSISTANT_JOB_URL}/project/{project_id}")
    assert list_response.status_code == 200, list_response.text
    jobs = TypeAdapter(list[LLMAssistantJobRead]).validate_python(list_response.json())
    assert [job.job_id for job in jobs] == [finished.job_id]
    assert jobs[0].status == JobStatus.FINISHED

    abort_response = client.post(f"{LLM_ASSISTANT_JOB_URL}/{finished.job_id}/abort")
    assert abort_response.status_code == 200, abort_response.text
    assert abort_response.json() is False

    retry_response = client.post(f"{LLM_ASSISTANT_JOB_URL}/{finished.job_id}/retry")
    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json() is False


@pytest.mark.llm
def test_failed_job_can_be_retried_and_fails_again_with_the_same_invalid_model(
    client: TestClient,
    job_prompt_project: JobPromptProject,
) -> None:
    """Retry requeues a failed job while preserving its typed invalid input."""
    payload = _tagging_payload(
        job_prompt_project, model="definitely-not-an-available-model"
    )
    started = _start_job(client, payload)
    failed = _wait_for_status(client, started.job_id, JobStatus.FAILED)
    assert failed.output is None

    retry_response = client.post(f"{LLM_ASSISTANT_JOB_URL}/{failed.job_id}/retry")
    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json() is True

    failed_again = _wait_for_status(client, failed.job_id, JobStatus.FAILED)
    assert failed_again.input == payload
    assert failed_again.output is None


@pytest.mark.parametrize(
    "suffix",
    [
        # Reading an unknown job returns the registered not-found response.
        pytest.param("", id="get"),
        # Aborting an unknown job returns the registered not-found response.
        pytest.param("/abort", id="abort"),
        # Retrying an unknown job returns the registered not-found response.
        pytest.param("/retry", id="retry"),
    ],
)
def test_job_management_rejects_nonexistent_job_ids(
    client: TestClient, suffix: str
) -> None:
    """Every single-job management route returns HTTP 404 for an unknown ID."""
    method = client.get if suffix == "" else client.post
    response = method(f"{LLM_ASSISTANT_JOB_URL}/not-a-real-job{suffix}")
    assert response.status_code == 404, response.text
