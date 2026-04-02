# 20 Newsgroups (Benchmark Dataset)

## What Is This Dataset About?

This dataset is a 4-class subset of the classic 20 Newsgroups corpus for topic/document classification.

In this repository, we keep the following target classes:

- `alt.atheism`
- `comp.graphics`
- `sci.space`
- `talk.politics.mideast`

## Where Can It Be Found?

- Scikit-learn dataset documentation:
  - https://scikit-learn.org/stable/datasets/real_world.html#the-20-newsgroups-text-dataset
- Loaded in our pipeline via `sklearn.datasets.fetch_20newsgroups`.

## Links (Website / Download / Citation)

- Scikit-learn API reference:
  - https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_20newsgroups.html

## Benchmark Task Usage

- Task 1: Document Classification

## Dataset Size (Current Files)

- `test_sampled.parquet` (main benchmark file): 120 samples
- `test_full_raw.parquet` (reference full split): 1478 samples

## How We Preprocess It

Preprocessing is implemented in `20newsgroups_dataset_creation.py`.

Main steps:

1. Load subset (`train`, `test`, or `all`) with selected categories.
2. Remove metadata noise from raw posts:
   - headers
   - footers
   - quotes
3. Normalize whitespace and trim each document to a maximum character length (`max_chars`, default `3000`).
4. Build a dataframe with:
   - `document_id`
   - `document_text`
   - numeric `target`
   - string `label` mapped from `target`
5. Save full processed split to `test_full_raw.parquet`.
6. Create label-balanced sampled set (default up to `30` samples per class) and save to `test_sampled.parquet`.

## Final Dataset Structure

### File: `test_full_raw.parquet`

- `document_id`: integer document identifier
- `document_text`: cleaned text content
- `target`: integer class index
- `label`: class name (string)

### File: `test_sampled.parquet`

- Same schema as `test_full_raw.parquet`
- Contains class-balanced sampled records

## Notes

- The script currently writes output paths named `test_full_raw.parquet` and `test_sampled.parquet` regardless of selected subset argument.
