# GermanQuAD (Benchmark Dataset)

## What Is This Dataset About?

GermanQuAD is a German extractive question answering dataset.
Each sample contains a context paragraph, a question, and one or more answer spans.

## Where Can It Be Found?

- Hugging Face dataset: https://huggingface.co/datasets/deepset/germanquad
- Project page: https://www.deepset.ai/germanquad

## Benchmark Task Usage

- Task: Extractive QA

## How We Preprocess It

Preprocessing is implemented in `germanquad_dataset_creation.py`.

Main steps:

1. Load split (default: `test`) from Hugging Face.
2. Keep `context`, `question`, and metadata (`id`, `title`).
3. Build a SQuAD-style reference object per sample:
   - `id`
   - `answers.text`
   - `answers.answer_start`
4. Store this reference object as JSON string in the `reference` column.
5. Save to parquet (`test.parquet`).

## Final Dataset Structure

### File: `test.parquet`

- `id`: sample id (string)
- `title`: article title
- `context`: context paragraph
- `question`: question text
- `answer_count`: number of annotated answers
- `is_answerable`: whether at least one answer span exists
- `reference`: JSON string with SQuAD-style reference payload
