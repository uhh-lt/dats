# Few-NERD (Benchmark Dataset)

## What Is This Dataset About?

Few-NERD is an English named entity recognition dataset with coarse and fine-grained entity labels.

In this benchmark, it is used for token/span labeling.

## Where Can It Be Found?

- Hugging Face dataset:
  - https://huggingface.co/datasets/DFKI-SLT/few-nerd

## Links (Website / Download / Citation)

- Dataset repository:
  - https://github.com/thunlp/Few-NERD
- Hugging Face dataset card:
  - https://huggingface.co/datasets/DFKI-SLT/few-nerd

## Benchmark Task Usage

- Task 3: Span Classification

## How We Preprocess It

Preprocessing is implemented in `fewnerd_dataset_creation.py`.

Main steps:

1. Load the `supervised` configuration from Hugging Face.
2. Select the `test` split.
3. Save the split to parquet without additional sampling or filtering.

## Final Dataset Structure

### File: `fewnerd_test.parquet`

The parquet file preserves original dataset columns, including at least:

- `tokens`: token sequence
- `ner_tags`: coarse tag sequence (integer IDs)
- `fine_ner_tags`: fine-grained tag sequence (integer IDs)
