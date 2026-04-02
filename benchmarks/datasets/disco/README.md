# DISCO (Disfluency Correction Dataset)

## What Is This Dataset About?

This dataset contains pairs of disfluent and fluent sentences for text rewrite/correction tasks.

The local folder includes multilingual spreadsheet sources (`German.xlsx`, `English.xlsx`, plus additional language sheets).

## Where Can It Be Found?

- Local source files in this repository:
  - `German.xlsx`
  - `English.xlsx`
  - `French.xlsx`
  - `Hindi.xlsx`
  - `Domain Type Distribution Sheet.xlsx`

## Links (Website / Download / Citation)

- The upstream download/citation link is not explicitly recorded in `disco_dataset_creation.ipynb`.
- Add the original release page and citation here once confirmed.

## Benchmark Task Usage

- Task 4.1: Disfluency Correction

## Dataset Size (Current Files)

- `disco_de.parquet`: 3096 samples
- `disco_en.parquet`: 3979 samples

## Label Space

`Disfluency Type` values available in both files:

- `C`
- `F`
- `FL`
- `FS`
- `R`

## How We Preprocess It

Preprocessing is implemented in `disco_dataset_creation.ipynb`.

Main steps:

1. Load language-specific spreadsheets.
2. Keep core sentence-pair columns needed for correction.
3. Drop non-essential metadata/helper columns.
4. Export language-specific Parquet files for benchmark usage.

## Final Dataset Structure

### File: `disco_de.parquet`

- `Sentence Number`
- `Disfluent Sentence`
- `Fluent Sentence`
- `Disfluency Type`

### File: `disco_en.parquet`

- `Sentence Number`
- `Disfluent Sentence`
- `Fluent Sentence`
- `Disfluency Type`

## Notes

- The notebook includes an output path named `disco_ger.parquet`; the current dataset folder contains `disco_de.parquet`.
