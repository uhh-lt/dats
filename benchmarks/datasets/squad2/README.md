# SQuAD v2 (Benchmark Dataset)

## What Is This Dataset About?

SQuAD v2 extends SQuAD by adding unanswerable questions.
Models must extract exact spans when answerable and abstain when not answerable.

## Where Can It Be Found?

- Hugging Face dataset: https://huggingface.co/datasets/squad_v2
- Original paper: https://arxiv.org/abs/1806.03822

## Benchmark Task Usage

- Task: Extractive QA

## How We Preprocess It

Preprocessing is implemented in `squad2_dataset_creation.py`.

Main steps:

1. Load split (default: `validation`) from Hugging Face.
2. Keep `context`, `question`, and metadata (`id`, `title`, `is_impossible`).
3. Build a SQuAD-style reference object per sample:
   - `id`
   - `answers.text`
   - `answers.answer_start`
4. Store this reference object as JSON string in the `reference` column.
5. Save to parquet (`validation.parquet`).

## Final Dataset Structure

### File: `validation.parquet`

- `id`: sample id (string)
- `title`: article title
- `context`: context paragraph
- `question`: question text
- `is_impossible`: original dataset flag
- `answer_count`: number of annotated answers
- `is_answerable`: whether at least one answer span exists
- `reference`: JSON string with SQuAD-style reference payload
