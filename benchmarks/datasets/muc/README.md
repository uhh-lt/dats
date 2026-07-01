# MUC (Template Filling Benchmark Dataset)

## What Is This Dataset About?

This dataset contains incident reports with event templates (incident type plus entity slots).

In this benchmark, it is used for information extraction and structured template filling.

## Where Can It Be Found?

- Local source files in this repository:
  - `train.jsonl`
  - `dev.jsonl`
  - `test.jsonl`

## Links (Website / Download / Citation)

- MUC data index:
  - https://www-nlpir.nist.gov/related_projects/muc/muc_data/muc_data_index.html

## Benchmark Task Usage

- Task 2.2: Template Filling

## Dataset Size (Current Files)

- `muc.parquet` (main benchmark file): 695 samples

## How We Preprocess It

Preprocessing is implemented in `muc_dataset_creation.ipynb`.

Main steps:

1. Load and merge `train.jsonl`, `dev.jsonl`, and `test.jsonl`.
2. Keep all records with exactly one template and sample a subset of zero-template records.
3. Flatten nested template fields into explicit columns.
4. Normalize incident label variants (for example, `attack / bombing` and `bombing / attack`).
5. Rename fields to benchmark schema names.
6. Keep slot values in list-based form where applicable.
7. Save processed output to `muc.parquet`.

## Final Dataset Structure

### File: `muc.parquet`

- `docid`: document identifier
- `doctext`: source document text
- `incident`: incident type label (list form)
- `perpetrator`: perpetrator mentions
- `group perpetrator`: group perpetrator mentions
- `target`: target mentions
- `victim`: victim mentions
- `weapon`: weapon mentions

### Incident Labels In `muc.parquet`

Observed incident values:

- `arson`
- `attack`
- `bombing`
- `kidnapping`
- `none`
- `robbery`

## Source JSONL Record Structure (Raw)

Each JSONL line contains:

- `docid`
- `doctext`
- `templates`

Template objects contain slot fields such as:

- `incident_type`
- `PerpInd`
- `PerpOrg`
- `Target`
- `Victim`
- `Weapon`
