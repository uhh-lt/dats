# Prompts

A prompt is the complete instruction to the LLM for one task (span annotation, sentence annotation, tagging, metadata extraction), written in one language. It contains everything the LLM sees except the document. Prompts belong to a project and are managed on the project's Prompts page; the LLM Assistant (and later the Prompt Studio) only runs them.

## Model

- `PromptORM`: project, name (unique per project), task, language (`en` / `de`) and an archive flag. Archived prompts are not offered for new runs; runs that used them keep their versions. There is no delete.
- `PromptVersionORM`: version number (1, 2, 3, ... per prompt), the prompt text, its selections and the author. Every save appends a version; versions are never changed, so runs that reference a version id can always be reproduced. Renaming or archiving does not create a version.
- The selections are copies of project data (`prompt_dto.py`): `codes` (`PromptCode`: id, name, description), `tags`, `metadata_fields`, `examples` and the `settings` of the blocks (chunk size and overlap, context length, fuzzy threshold). Later changes in the project do not change a version.
- Few-shot examples: a `SpanPromptExample` is the text of the sentences around a span annotation with all spans its annotator annotated in that text (annotations of the same text share one example); a `SentencePromptExample` is the text of a sentence annotation with its code. `POST /prompt/examples` builds them from annotation ids.

## Local definitions, pull and push

A prompt has its own copy of the name and description of every selected code, tag and metadata field (key and description). Users edit the copy in the prompt builder to try a definition without changing the project; it is saved with the next version like any other change. A prompt cannot introduce new codes, tags or metadata fields: every copy keeps the id of an existing one.

Pull and push need no endpoint of their own. The prompt builder pulls by copying the project's definitions from its cache into the draft, and pushes through the bulk updates of the codes, tags and metadata fields (`PATCH /code/bulk/update`, `PATCH /tag/bulk/update_tags`, `PATCH /projmeta/bulk/update`). The chosen side simply wins: there is no merge and no stored base.

## Blocks and validation

`prompt_specs.py` defines per task which blocks a prompt may use (`PROMPT_TASK_SPECS`, described by `GET /prompt/task_info?task_type=...` for the editor):

- exactly one document block `<document:whole|sentences|chunks>`: it decides how a document is split into LLM calls (tagging and metadata extraction only support `whole`, because their answers describe the whole document);
- exactly one output format block `<output-format:inline|context|sentences|tags|metadata>` of the task: it renders the fixed answer instructions (`prompt_blocks.py`), which the parser of the format relies on;
- the selection blocks of the task: `<codes>` / `<code_names>` (at least one for annotation tasks), `<examples>`, `<tags>`, `<metadata_fields>`.

`PromptService.validate_prompt()` rejects prompts that break these rules, selections of another project and examples that do not fit the task or are not shown through `<examples>` (HTTP 400). Selections may be empty when saving; a run requires them (`assert_runnable`). Placeholder-like tags that no block fills (e.g. a typo like `<code>`) are reported by the preview but not rejected, since prompts may contain XML-like markup.

## Rendering

`prompt_renderer.py` renders a validated prompt: it fills the blocks in the prompt's language, splits a document into segments (whole document, sentences, or overlapping token chunks; for the sentence format, chunks show the numbered sentences that start in them) and puts each segment into the document block. Inline and context examples show only the spans of the selected codes; a prompt that renders at least one example is few-shot. `POST /prompt/preview` renders a stored version or an unsaved draft for one segment of a document, or without a document.

The strategies in `modules/llm_assistant/strategies` implement the output formats: the structured-output schema and the parsing of the answers into annotations, tags or metadata values. They use the renderer's segments, so the offsets of an answer refer to exactly the text the LLM saw.

## Default prompts

`ProjectService.create_project` calls `create_default_prompts`, which creates one prompt per output format and language (`default-<slug>-<language>`, version 1 by the system user, no selections) from `prompt_defaults.py`. `GET /prompt/default` returns the same prompts; the guided path of the LLM Assistant runs them with the wizard's selections. Changing a default text only affects new projects; the migration that introduced prompts froze the texts for existing projects.
