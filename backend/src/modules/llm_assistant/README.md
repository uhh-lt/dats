# LLM Assistant

The LLM Assistant module provides AI-powered document analysis capabilities: tagging, metadata extraction, span annotation, and sentence annotation.

## Architecture

The module is built around three core concepts: **Tasks**, **Strategies**, and **Approaches**.

```
┌─────────────────────────────────────────────────────────┐
│                      llm_job.py                         │
│  Entry point. Receives LLMJobInput, builds strategy &   │
│  task via factories, calls task.execute().              │
└──────────────┬─────────────────────┬────────────────────┘
               │                     │
     ┌─────────▼─────────┐  ┌────────▼────────┐
     │  strategy_factory │  │  task_factory   │
     │  build_strategy() │  │  build_task()   │
     └─────────┬─────────┘  └────────┬────────┘
               │                     │
     ┌─────────▼─────────┐  ┌────────▼────────┐
     │    LLMStrategy    │  │     LLMTask     │
     │  (HOW to do it)   │  │  (WHAT to do)   │
     │                   │  │                 │
     │ - build_prompt()  │  │ - execute()     │
     │ - parse_result()  │  │ - determine_    │
     │ - response_model  │  │   approach()    │
     └───────────────────┘  └─────────────────┘
```

### Tasks (`tasks/`)

A **task** describes **WHAT** the LLM assistant does. Each task is a class inheriting from `LLMTask` and implements:

- **`execute()`** — the batch-processing skeleton: iterates documents in batches, builds prompts via the strategy, calls the LLM, assembles per-document results.
- **`determine_approach()`** — a classmethod that recommends zero-shot vs few-shot based on the task parameters (e.g., how many annotations exist per code).

| Task | File | Description |
|------|------|-------------|
| `TaggingTask` | `tagging_task.py` | Assign tags to documents |
| `MetadataExtractionTask` | `metadata_extraction_task.py` | Extract metadata from documents |
| `AnnotationTask` | `annotation_task.py` | Create span annotations in documents |
| `SentenceAnnotationTask` | `sentence_annotation_task.py` | Classify individual sentences |

### Strategies (`strategies/`)

A **strategy** describes **HOW** the LLM assistant accomplishes a task. Each strategy inherits from `LLMStrategy` and owns:

- **Prompt building** — constructs system + user prompts from templates, with placeholder substitution (`<document>`, `<sentence>`, `<chunk>`)
- **Response model** — the Pydantic model used for structured LLM output
- **`parse_result()`** — parses the LLM response and grounds it to document offsets

| Strategy | Task | Description |
|----------|------|-------------|
| `TaggingStrategy` | Tagging | Default tagging via structured output |
| `MetadataStrategy` | Metadata Extraction | Default metadata extraction |
| `NERInlineTagStrategy` | Annotation | LLM repeats text with inline XML tags |
| `FuzzyGroundingStrategy` | Annotation | LLM extracts text passages as JSON; backend grounds them via fuzzy matching |
| `SentenceAnnotationStrategy` | Sentence Annotation | Per-sentence classification |

A task can support multiple strategies (e.g., Annotation has two). The mapping is defined in `llm_task_strategy_mapping.py`.

### Approaches

An **approach** is zero-shot or few-shot. The `determine_approach()` classmethod on each task decides which approaches are available and recommended based on the current project state (e.g., number of existing annotations per code).

### Factories

- **`build_strategy()`** (`strategies/strategy_factory.py`) — instantiates the correct strategy for a given task + strategy type, wiring up prompt templates, params, and project context.
- **`build_task()`** (`tasks/task_factory.py`) — instantiates the correct task for a given task type, injecting the `LLMRepo`.

### Prompts (`prompts/`)

- **`data_tag.py`** — `DataTag` enum defining the placeholder tags (`<document>`, `<sentence>`, `<chunk>`) used in user prompt templates. The tag determines how a document is split into individual LLM calls.
- **`system_prompt.py`** — System prompt templates per language (en, de).

### DTOs (`llm_job_dto.py`)

All request/response types: task parameters (`TaggingParams`, `AnnotationParams`, ...), approach parameters (`ZeroShotParams`, `FewShotParams`), strategy parameters, job input/output, and `ApproachRecommendation`.

### Service (`llm_service.py`)

Thin orchestration layer used by the REST endpoints. Delegates to tasks and strategies via the factories. Handles:
- `determine_approach` → delegates to `task_cls.determine_approach()`
- `create_prompt_templates` → builds a strategy to generate prompt templates
- `list_strategies` → returns available strategies for a task type
- `count_existing_assistant_annotations` → counts prior assistant annotations

### Endpoints (`llm_endpoint.py`)

REST API under `/llm/`:
- `POST /llm/determine_approach` — get approach recommendation
- `POST /llm/create_prompt_templates` — generate prompt templates
- `POST /llm/list_strategies` — list available strategies
- `POST /llm/count_existing_assistant_annotations` — count existing annotations
- Job start/status/result endpoints (auto-generated by `@register_job`)

## Adding a New Task

1. Create a new params class in `llm_job_dto.py` (inherit `DocumentBasedTaskParams`)
2. Create a result class in `llm_job_dto.py`
3. Create the task class in `tasks/`, inheriting `LLMTask`
4. Implement `execute()` and `determine_approach()`
5. Register in `tasks/task_factory.py` (`TASK_FOR_TASK_TYPE`)
6. Create at least one strategy in `strategies/`
7. Register the strategy in `llm_task_strategy_mapping.py` (`STRATEGIES_FOR_TASK_TYPE`)

## Adding a New Strategy

1. Create a params class in `llm_job_dto.py` (inherit `SpecificStrategyParameters`)
2. Create the strategy class in `strategies/`, inheriting `LLMStrategy`
3. Set class attributes: `strategy_type`, `display_name`, `description`, `strategy_params_type`, `allowed_data_tags`
4. Implement `parse_result()` and `get_response_model()`
5. Register in `llm_task_strategy_mapping.py` (`STRATEGIES_FOR_TASK_TYPE`)
