# LLM Assistant

The LLM Assistant module provides AI-powered document analysis capabilities: tagging, metadata extraction, span annotation, and sentence annotation.

## Architecture

The module is built around three core concepts: **Tasks**, **Strategies**, and **Approaches**.

```
┌──────────────────────────────────────────────────────────┐
│                   llm_assistant_job.py                   │
│  Entry point. Receives LLMAssistantJobInput, builds      │
│  strategy & task via factories, calls task.execute().    │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
      ┌─────────▼─────────┐       ┌────────▼────────┐
      │  strategy_factory │       │  task_factory   │
      │  build_strategy() │       │  build_task()   │
      └─────────┬─────────┘       └────────┬────────┘
                │                          │
  ┌─────────────▼────────────┐  ┌──────────▼──────────┐
  │   LLMAssistantStrategy   │  │  LLMAssistantTask   │
  │     (HOW to do it)       │  │   (WHAT to do)      │
  │                          │  │                     │
  │ - generate_prompts()     │  │ - execute()         │
  │ - parse_result()         │  │ - determine_        │
  │ - response_model         │  │   approach()        │
  └──────────────────────────┘  └─────────────────────┘
```

### Tasks (`tasks/`)

A **task** describes **WHAT** the LLM assistant does. `LLMAssistantTask.execute()` is a final Template Method that always runs the same lifecycle:

1. Initialize the job and create its execution context.
2. Run the optional task-specific `_prepare()` hook.
3. Ask `LLMAssistantDocumentProcessor` to generate and batch the actual LLM requests.
4. Pass each complete document response to `_process_document()`.
5. Pass all document results to `_build_output()`.

Concrete tasks implement `_get_response_model()`, `_process_document()`, `_build_output()`, and `determine_approach()`. They override `_prepare()` only when setup such as deleting prior annotations is required.

`LLMAssistantDocumentProcessor` owns the batching mechanics. It loads documents incrementally and batches actual prompt requests rather than documents. A strategy may yield one or many prompts per document; responses retain their document and message (sentence/chunk) identity and are delivered to tasks only when the document is complete.

| Task                     | File                          | Description                          |
| ------------------------ | ----------------------------- | ------------------------------------ |
| `TaggingTask`            | `tagging_task.py`             | Assign tags to documents             |
| `MetadataExtractionTask` | `metadata_extraction_task.py` | Extract metadata from documents      |
| `AnnotationTask`         | `annotation_task.py`          | Create span annotations in documents |
| `SentenceAnnotationTask` | `sentence_annotation_task.py` | Classify individual sentences        |

### Strategies (`strategies/`)

A **strategy** describes **HOW** the LLM assistant accomplishes a task. Each strategy inherits from `LLMAssistantStrategy` and owns:

- **`generate_prompts()`** — lazily yields the system + user messages required for a document, with placeholder substitution (`<document>`, `<sentence>`, `<chunk>`, `<codes>`); `preview_prompt()` renders a single message the same way
- **Response model** — the Pydantic model used for structured LLM output
- **`parse_result()`** — parses the LLM response and grounds it to document offsets

| Strategy                     | Task                | Description                                                                 |
| ---------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `TaggingStrategy`            | Tagging             | Default tagging via structured output                                       |
| `MetadataStrategy`           | Metadata Extraction | Default metadata extraction                                                 |
| `NERInlineTagStrategy`       | Annotation          | LLM repeats text with inline XML tags                                       |
| `FuzzyGroundingStrategy`     | Annotation          | LLM extracts text passages as JSON; backend grounds them via fuzzy matching |
| `SentenceAnnotationStrategy` | Sentence Annotation | Per-sentence classification                                                 |

A task can support multiple strategies (e.g., Annotation has two). The mapping is defined in `strategies/strategy_factory.py`.

The code-based strategies (`NERInlineTagStrategy`, `FuzzyGroundingStrategy`, `SentenceAnnotationStrategy`) inherit from `CodeAnnotationStrategy`. Their user prompts contain the `<codes>` placeholder instead of written-out code definitions. The strategy renders it from the code definitions (id, name, description) of the task parameters (`code_definitions`, e.g. experiment-scoped drafts) or, by default, from the project's current codes, and maps LLM answers back to code ids by these names. A prompt is therefore identified by template version x code definitions.

### Placeholders and validation

`LLMAssistantStrategy.validate_prompt_templates()` validates templates without building a strategy:

- there is exactly one template per supported language (`en`, `de`);
- every user prompt contains exactly one data tag (`<document>`, `<sentence>` or `<chunk>`) that the strategy supports, and the same one in all languages;
- code-based strategies require `<codes>` in every user prompt; `<codes>` is rejected in system prompts and in strategies without code definitions;
- the system prompt may contain `<project_title>` and `<project_description>`.

All placeholders are filled in a single pass, so inserted text (documents, code descriptions) is never scanned for placeholders again.

### Approaches

An **approach** is zero-shot or few-shot. The `determine_approach()` classmethod on each task decides which approaches are available and recommended based on the current project state (e.g., number of existing annotations per code).

### Factories

- **`build_strategy()`** (`strategies/strategy_factory.py`) — instantiates the correct strategy for a given task + strategy type, wiring up prompt templates, params, and project context.
- **`build_task()`** (`tasks/task_factory.py`) — instantiates the correct task for a given task type, injecting the `LLMRepo`.

### Prompts (`prompts/`)

- **`data_tag.py`** — `DataTag` enum defining the placeholder tags (`<document>`, `<sentence>`, `<chunk>`) used in user prompt templates. The tag determines how a document is split into individual LLM calls.
- **`system_prompt.py`** — System prompt templates per language (en, de).

### Prompt template register (`prompt_template_*.py`)

Prompt templates are stored per project (`PromptTemplateORM`: name, task type, strategy) with immutable versions (`PromptTemplateVersionORM`: the prompts of all languages, version number 1, 2, 3, ... per template, author). Every save appends a new version; versions are never updated. Renaming a template does not create a version. `PromptTemplateService` validates every version with the template's strategy and resolves the prompts of jobs and previews (`resolve_prompts`), which take either inline `prompts` or a `prompt_template_version_id`.

### DTOs (`llm_assistant_job_dto.py`)

All request/response types: task parameters (`TaggingParams`, `AnnotationParams`, ...), approach parameters (`ZeroShotParams`, `FewShotParams`), strategy parameters, job input/output, and `ApproachRecommendation`.

### Service (`llm_assistant_service.py`)

Thin orchestration layer used by the REST endpoints. Delegates to tasks and strategies via the factories. Handles:

- `determine_approach` → delegates to `task_cls.determine_approach()`
- `create_prompt_templates` → builds a strategy to generate prompt templates
- `preview_prompt` → renders one message (sentence or chunk) of a document with inline prompts or a stored version
- `list_strategies` → returns available strategies for a task type
- `count_existing_assistant_annotations` → counts prior assistant annotations

### Endpoints (`llm_assistant_endpoint.py`)

REST API under `/llm_assistant/`:

- `POST /llm_assistant/determine_approach` — get approach recommendation
- `POST /llm_assistant/create_prompt_templates` — generate prompt templates
- `POST /llm_assistant/preview_prompt` — render the filled prompts for a document and message index
- `POST /llm_assistant/list_strategies` — list available strategies
- `POST /llm_assistant/count_existing_assistant_annotations` — count existing annotations
- Job start/status/result endpoints (auto-generated by `@register_job`)

REST API under `/prompt_template/` (`prompt_template_endpoint.py`): create a template with its first version, save the next version, list a project's templates with their versions, read a template or a version, rename and delete.

## Adding a New Task

1. Create a new params class in `llm_assistant_job_dto.py` (inherit `DocumentBasedTaskParams`)
2. Create a result class in `llm_assistant_job_dto.py`
3. Create the task class in `tasks/`, inheriting `LLMAssistantTask`
4. Implement `_get_response_model()`, `_process_document()`, `_build_output()`, and `determine_approach()`
5. Register in `tasks/task_factory.py` (`TASK_FOR_TASK_TYPE`)
6. Create at least one strategy in `strategies/`
7. Register the strategy in `strategies/strategy_factory.py` (`STRATEGIES_FOR_TASK_TYPE`)

## Adding a New Strategy

1. Create a params class in `llm_assistant_job_dto.py` (inherit `SpecificStrategyParameters`)
2. Create the strategy class in `strategies/`, inheriting `LLMAssistantStrategy`
3. Set class attributes: `strategy_type`, `display_name`, `description`, `strategy_params_type`, `allowed_data_tags` (inherit `CodeAnnotationStrategy` for strategies that annotate with codes; it sets the `<codes>` placeholder)
4. Implement `parse_result()` and `get_response_model()`
5. Register in `strategies/strategy_factory.py` (`STRATEGIES_FOR_TASK_TYPE`)
