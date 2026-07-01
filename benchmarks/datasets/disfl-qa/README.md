# Disfl-QA (Benchmark Dataset)

## What Is This Dataset About?

Disfl-QA contains disfluent question variants and their fluent/original versions.

It can be used to evaluate robustness to spoken-style disfluencies and to evaluate correction/normalization quality for question inputs.

## Where Can It Be Found?

- Local files in this repository:
  - `train.json`
  - `dev.json`
  - `test.json`

## Links (Website / Download / Citation)

- Dataset repository:
  - https://github.com/google-research-datasets/Disfl-QA
- Paper:
  - https://aclanthology.org/2021.findings-acl.293/

## Benchmark Task Usage

- Primary: Task 4.1 Disfluency Correction (question normalization)
- Secondary/related: QA robustness experiments

## Dataset Size (Current Files)

- `disfl_qa_test.parquet` (main benchmark file): 3643 samples

## How We Preprocess It

Preprocessing is implemented in `disflqa_dataset_creation.ipynb`.

Main steps:

1. Load `test.json`.
2. Flatten dictionary-style entries into row-wise records.
3. Preserve original QA item ID as `id`.
4. Export test set to `disfl_qa_test.parquet`.

## Final Dataset Structure

### File: `disfl_qa_test.parquet`

- `original`: fluent/original question text
- `disfluent`: disfluent question text
- `id`: dataset record identifier
