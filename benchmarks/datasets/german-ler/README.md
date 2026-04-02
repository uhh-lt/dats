# German-LER (Benchmark Dataset)

## What Is This Dataset About?

German-LER is a German-language named entity recognition dataset.

In this benchmark, it is used for token/span labeling (BIO tagging) with both fine-grained and coarse-grained labels.

## Where Can It Be Found?

- Hugging Face dataset:
  - https://huggingface.co/datasets/elenanereiss/german-ler

## Links (Website / Download / Citation)

- Dataset card:
  - https://huggingface.co/datasets/elenanereiss/german-ler

## Benchmark Task Usage

- Task 3: Span Classification

## Dataset Size (Current Files)

- `german_ler_test.parquet` (main benchmark file): 6673 samples

## How We Preprocess It

Preprocessing is implemented in `german_ler_creation.ipynb`.

Main steps:

1. Load dataset via `load_dataset("elenanereiss/german-ler")`.
2. Work from the test split for benchmark evaluation.
3. Preserve tokenized input sequence.
4. Generate/keep both label granularities:
   - `fine_ner_tags`
   - `ner_tags` (coarser mapping)
5. Convert labels to integer ID sequences suitable for modeling/evaluation.
6. Save result to `german_ler_test.parquet`.

## Final Dataset Structure

### File: `german_ler_test.parquet`

- `id`: sample identifier
- `tokens`: token sequence
- `ner_tags`: coarse BIO tag sequence (integer IDs)
- `fine_ner_tags`: fine-grained BIO tag sequence (integer IDs)

## Tag Definitions Used In The Final Dataset

The final Parquet stores integer ID sequences. During preprocessing, IDs map to merged semantic labels as follows.

### `ner_tags` (coarse) ID -> label

- `0`: `O`
- `1`: `Person`
- `2`: `Ort`
- `3`: `Organisation`
- `4`: `Norm`
- `5`: `Gesetz`
- `6`: `Rechtsprechung`
- `7`: `Literatur`

### `fine_ner_tags` (fine) ID -> label

- `0`: `O`
- `1`: `Person`
- `2`: `Anwalt`
- `3`: `Richter`
- `4`: `Land`
- `5`: `Stadt`
- `6`: `Straße`
- `7`: `Landschaft`
- `8`: `Organisation`
- `9`: `Unternehmen`
- `10`: `Institution`
- `11`: `Gericht`
- `12`: `Marke`
- `13`: `Gesetz`
- `14`: `Verordnung`
- `15`: `EU Norm`
- `16`: `Vorschrift`
- `17`: `Vertrag`
- `18`: `Rechtsprechung`
- `19`: `Literatur`
