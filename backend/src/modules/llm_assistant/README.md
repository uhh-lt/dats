# LLM Assistant

The LLM Assistant module provides AI-powered document analysis capabilities: tagging, metadata extraction, span annotation, and sentence annotation.

## Architecture

The module runs prompts (`core/prompt_template`, see its README) on documents. A prompt decides everything but the documents and the model; the module is built around **Tasks** and **Strategies** that turn the LLM's answers into results.

```
┌──────────────────────────────────────────────────────────┐
│                   llm_assistant_job.py                   │
│  Entry point. Resolves the prompt (version or draft),    │
│  builds strategy & task via factories, task.execute().   │
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
  │ - parse_result()         │  │                     │
  │ - response_model         │  │                     │
  └──────────────────────────┘  └─────────────────────┘
```

### Tasks (`tasks/`)

A **task** describes **WHAT** the LLM assistant does. `LLMAssistantTask.execute()` is a final Template Method that always runs the same lifecycle:

1. Initialize the job and create its execution context.
2. Run the optional task-specific `_prepare()` hook.
3. Ask `LLMAssistantDocumentProcessor` to generate and batch the actual LLM requests.
4. Pass each complete document response to `_process_document()`.
5. Pass all document results to `_build_result()` and wrap them in the job output with the approach.

Concrete tasks implement `_get_response_model()`, `_process_document()` and `_build_result()`. They override `_prepare()` only when setup such as deleting prior annotations is required.

`LLMAssistantDocumentProcessor` owns the batching mechanics. It loads documents incrementally and batches actual prompt requests rather than documents. A strategy may yield one or many prompts per document; responses retain their document and message (sentence/chunk) identity and are delivered to tasks only when the document is complete.

| Task                     | File                          | Description                          |
| ------------------------ | ----------------------------- | ------------------------------------ |
| `TaggingTask`            | `tagging_task.py`             | Assign tags to documents             |
| `MetadataExtractionTask` | `metadata_extraction_task.py` | Extract metadata from documents      |
| `AnnotationTask`         | `annotation_task.py`          | Create span annotations in documents |
| `SentenceAnnotationTask` | `sentence_annotation_task.py` | Classify individual sentences        |

### Strategies (`strategies/`)

A **strategy** implements an **output format** of the prompt (`<output-format:...>`). The prompt and its `PromptRenderer` decide what the LLM sees; each strategy inherits from `LLMAssistantStrategy` and owns:

- **`generate_prompts()`** — yields one message per segment of a document, rendered by the prompt's renderer (no system prompt)
- **Response model** — the Pydantic model used for structured LLM output
- **`parse_result()`** — parses the LLM response and grounds it to document offsets, using the segment of the message

| Strategy                     | Output format | Task                | Description                                                                 |
| ---------------------------- | ------------- | ------------------- | --------------------------------------------------------------------------- |
| `TaggingStrategy`            | `tags`        | Tagging             | Selected tags via structured output                                         |
| `MetadataStrategy`           | `metadata`    | Metadata Extraction | One value per selected metadata field                                       |
| `NERInlineTagStrategy`       | `inline`      | Annotation          | LLM repeats text with inline XML tags                                       |
| `FuzzyGroundingStrategy`     | `context`     | Annotation          | LLM extracts text passages as JSON; backend grounds them via fuzzy matching |
| `SentenceAnnotationStrategy` | `sentences`   | Sentence Annotation | LLM answers the numbers of the sentences that fit a code                    |

The mapping is defined in `strategies/strategy_factory.py`. Strategies do not render prompts; codes, tags and metadata fields come from the prompt's snapshots and LLM answers are mapped back to their ids by the names the prompt shows. Every output format works with every document unit of its task (whole document, sentences, chunks); overlapping chunks produce duplicate results, which the tasks merge.

### Approaches

An **approach** is zero-shot or few-shot. It follows from the prompt: a prompt that shows examples is few-shot. The approach decides which assistant user the annotations belong to, and the job output reports it.

### Factories

- **`build_strategy()`** (`strategies/strategy_factory.py`) — instantiates the strategy of a prompt's output format.
- **`build_task()`** (`tasks/task_factory.py`) — instantiates the correct task for a given task type, injecting the `LLMRepo`.

### Prompts (`prompts/`)

- **`image_captioning_prompt.py`** — the prompt of the image captioning in document processing.

### DTOs (`llm_assistant_job_dto.py`)

The job input (task, documents, model, and either a `prompt_template_version_id` or an unsaved `draft` prompt, e.g. of the wizard's guided path) and the job outputs per task.

### Service (`llm_assistant_service.py`)

- `count_existing_assistant_annotations` → counts prior assistant annotations of an approach

### Endpoints (`llm_assistant_endpoint.py`)

REST API under `/llm_assistant/`:

- `POST /llm_assistant/count_existing_assistant_annotations` — count existing annotations
- Job start/status/result endpoints (auto-generated by `@register_job`)

The prompt preview is `POST /prompt_template/preview` in `core/prompt_template`.

## Adding a New Task

1. Add the task type and its spec (`core/prompt_template/prompt_template_specs.py`), its output format(s) with answer instructions (`prompt_template_blocks.py`) and default prompts (`prompt_template_defaults.py`); new projects get them as default templates, existing projects need a data migration
2. Create a result class in `llm_assistant_job_dto.py`
3. Create the task class in `tasks/`, inheriting `LLMAssistantTask`
4. Implement `_get_response_model()`, `_process_document()` and `_build_result()`
5. Register in `tasks/task_factory.py` (`TASK_FOR_TASK_TYPE`)
6. Create a strategy per output format and register it in `strategies/strategy_factory.py`

## Adding a New Output Format

1. Add it to `OutputFormat`, `OUTPUT_FORMAT_SPECS` and the `output_formats` of its task (`core/prompt_template/prompt_template_specs.py`)
2. Write its fixed answer instructions per language (`prompt_template_blocks.py`) and, if the task has examples, how the renderer shows them (`prompt_template_renderer.py`)
3. Add default prompts (`prompt_template_defaults.py`); existing projects need a data migration
4. Create the strategy class in `strategies/` with `output_format`, `get_response_model()` and `parse_result()`, and register it in `strategies/strategy_factory.py`
