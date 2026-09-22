# llm-file-converter

Convert text-based files (e.g. OCR'd XML scans) to **basic HTML**, **plain text**, and
**structured metadata** using an OpenAI-compatible LLM (e.g. vLLM).

The tool sends each file to the LLM in a single structured-output request. The LLM
extracts the plain text, converts the content to basic semantic HTML, optionally
corrects obvious OCR errors, and extracts user-defined metadata fields. Output file
names are constructed in code from the extracted metadata — never by the LLM.

## Installation

```bash
uv sync
```

## Quick start

```bash
cp .env.example .env   # fill in LLM_MODEL and your endpoint
uv run llm-file-converter INPUT_DIR OUTPUT_DIR
```

Or pass everything via CLI options:

```bash
uv run llm-file-converter INPUT_DIR OUTPUT_DIR \
  --model "Qwen/Qwen3-32B" \
  --api-base "http://localhost:8000/v1" \
  --api-key "EMPTY" \
  --prompt-template newspaper_ocr \
  --metadata-fields '{"year": {"type": "integer", "description": "Publication year"}}' \
  --filename-template '{{ original_stem }}_year-{{ metadata.year }}'
```

## Configuration

Every option can be set via CLI argument or `LLM_*` environment variable.
Precedence: **CLI argument > environment variable > `.env` file > default**.
See [.env.example](.env.example) for the full list and `uv run llm-file-converter --help`
for option documentation.

Useful flags:

- `--dry-run` — list the files that would be converted, without calling the LLM.
- `--overwrite` — re-convert files whose output already exists (default: skip).
- `--concurrency N` — convert N files in parallel (default: 4).

## Output

For each input file `scan001.xml`, the output folder receives:

| File                | Content                                                |
| ------------------- | ------------------------------------------------------ |
| `scan001.html`      | Basic semantic HTML (omitted if the LLM returned none) |
| `scan001.txt`       | Extracted plain text                                   |
| `scan001.meta.json` | Extracted metadata, model name, token usage            |

Plus one `report.jsonl` per run with per-file status (`ok` / `failed` / `skipped`),
error messages, and token usage. Failed files never abort the run; the exit code is
`1` if any file failed.

## Prompt templates

Prompt templates are Jinja2 files. Three are bundled and selectable by name via
`--prompt-template`:

- `default` — generic text → HTML conversion (used when the option is omitted)
- `newspaper_ocr` — OCR'd newspaper scans: reading-order reconstruction, OCR error
  correction, page-furniture removal
- `clean_html` — most minimal semantic HTML, faithful text preservation

You can also pass a path to your own `.j2` file. Available template variables:

| Variable          | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `file_content`    | Raw text content of the input file                         |
| `filename`        | Original file name                                         |
| `metadata_fields` | Human-readable list of the metadata spec (empty when none) |
| `output_schema`   | JSON schema of the expected LLM output                     |

## Metadata extraction

Describe the metadata fields the LLM should extract as a JSON object (inline or as a
path to a JSON file):

```json
{
  "year": { "type": "integer", "description": "Publication year" },
  "author": { "type": "string", "description": "Author of the article" },
  "pages": { "type": "integer" }
}
```

Allowed types: `string` (default), `integer`, `number`, `boolean`. **All fields are
optional** — if the LLM cannot determine a value, the field is simply `null` and the
conversion still succeeds.

## Output file names

`--filename-template` is a Jinja2 template rendered per file. Available variables:
`original_filename`, `original_stem`, `original_suffix`, `metadata`, `index`.

```
{{ original_stem }}_year-{{ metadata.year }}_month-{{ metadata.month }}
```

Missing metadata renders as an empty string; if the rendered name is empty, the
original file name is used as fallback. Names are sanitized and collisions are
resolved by appending `-2`, `-3`, …

## Development

```bash
uv sync              # install all dependencies (incl. dev)
uv run pytest        # run the test suite
uv run ruff check    # lint
uv run ruff format   # format
```

See [plan.md](plan.md) for the full technical specification.
