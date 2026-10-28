# Prompt Templates

A **prompt template** is a complete prompt for one task (span annotation, sentence annotation, document tagging or metadata extraction), written in one language. It contains everything the language model sees except the document: the instructions you write, the codes, tags or metadata fields you select, few-shot examples and the answer format. The [LLM Assistant](llm-assistant.md) runs templates on documents. Templates belong to your project, so the whole team works with the same prompts and can see which prompt produced which results.

Open the **Prompts** page from the project sidebar. On the left, the explorer shows one folder per task with its templates: search them by name, create one with **Create new prompt**, and use a template's context menu to duplicate or archive it. In the center, the selected template: a toolbar with its name, version, **Write** / **Preview**, refresh selections, duplicate, archive and, while the draft has unsaved changes, **Discard** and **Save** (also Ctrl+S); below it the prompt. On the right, the blocks of the task with their settings. Both sidebars can be resized.

## Blocks

A prompt is text with **blocks**, which are replaced when the prompt is sent. The right sidebar lists every block of the template's task, each with its chip (the ⓘ icon explains it). Click a chip to insert the block at the cursor; a green chip means the prompt uses it, a red one marks a required block that is missing.

| Block                                                           | Replaced with                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<document:whole>`, `<document:sentences>`, `<document:chunks>` | The document. The prompt contains exactly one of them. It decides whether the model is called once per document, per sentence or per chunk (chunk size and overlap are settings of the block). Tagging and metadata extraction always use the whole document.                                                   |
| `<output-format:...>`                                           | The fixed answer instructions of an answer format, e.g. `<output-format:inline>` (repeat the text with inline tags) or `<output-format:context>` (quotes with context). The prompt contains exactly one. DATS relies on these instructions to read the answers, so they cannot be edited; the panel shows them. |
| `<codes>`, `<code_names>`                                       | The selected codes, with their descriptions or only their names.                                                                                                                                                                                                                                                |
| `<examples>`                                                    | The few-shot examples of the selected codes.                                                                                                                                                                                                                                                                    |
| `<tags>`                                                        | The selected tags with their descriptions (document tagging).                                                                                                                                                                                                                                                   |
| `<metadata_fields>`                                             | The selected metadata fields with their descriptions (metadata extraction). The answer format adds their value formats and example values.                                                                                                                                                                      |

A block expands with its settings as soon as the prompt contains it: write `<codes>` and the code selection appears, write `<examples>` and the example selection appears. `<document>` and `<output-format>` are written with their setting after a colon, e.g. `<document:chunks>`; the **Document** and **Output format** settings change it for you.

A placeholder-like text that no block fills, e.g. a typo like `<code>`, is sent to the model as it is; the preview warns about it.

## Selections are snapshots

When you save, the template stores the selected codes, tags and metadata fields with their current names and descriptions, and the examples with their current text. A version therefore always sends the same prompt, even if you later rename a code or change an annotation.

If the project changed since a version was saved, the editor marks the affected selections as _outdated_. **Refresh selections** replaces them with the current state of the project (deleted codes, tags, fields and annotations are dropped); save afterwards to keep the result as a new version.

## Few-shot examples

Templates of the annotation tasks can contain **few-shot examples**. Add `<examples>` to the prompt, click **Add examples**, choose a code and select span or sentence annotations of your project.

- A **span example** is the sentence around the selected annotation with all spans its annotator annotated there, so the example shows every relevant passage, not only the one you clicked. Only spans of the selected codes are shown to the model; the others are marked with a dotted line.
- A **sentence example** is the text of a sentence annotation with its code.

A prompt that shows at least one example makes a **few-shot** run in the LLM Assistant, otherwise the run is zero-shot.

## Preview

Switch between **Write** (the raw prompt with its blocks) and **Preview**. The preview shows the prompt exactly as the model receives it, also for unsaved changes. **Documents** selects the documents to preview (by default the documents of the examples); pick one of them and step through its sentences or chunks. Without documents, the preview keeps the document block as it is. If the prompt breaks a rule (e.g. two document blocks), the preview shows the error instead.

## Versions

Every save creates a new **version** (1, 2, 3, ...). Older versions never change, so you can always see exactly which prompt a run used and run it again.

- Use the **Version** selector to look at an older version. Saving while an older version is shown creates the next version from it.
- **Save** (as the next version) and **Discard** (back to the shown version) appear as soon as you changed the draft; otherwise the toolbar shows _Saved_.
- Renaming a template (click its name) or archiving it does not create a version.
- **Archive** hides a template from the LLM Assistant. Archived templates stay available, so runs that used them can still be traced; choose **Show archived prompts** in the explorer's menu to see them.

## Default templates

Every project starts with one default template per answer format in English and German, e.g. `default-sentence-annotation-en`. They select nothing yet, because a new project has no codes; select your codes, tags or fields and save a version. The guided path of the LLM Assistant uses the same default prompts with the selections you make in the wizard.

## Creating templates

**Create new prompt** creates a template from the default prompt of a task, answer format and language. **Duplicate** in the toolbar copies the prompt and selections shown in the editor into a new template; in the explorer's context menu it copies the latest version.
