# German Quotations (Benchmark Dataset)

## What Is This Dataset About?

This dataset focuses on quotation attribution in German news text.

In our benchmark setup, we transform document-level annotations into token-level span labels to support span classification for quote/speaker-related tagging.

## Where Can It Be Found?

- Project repository:
  - https://github.com/uhh-lt/german-news-quotation-attribution-2024

## Links (Website / Download / Citation)

- ACL Anthology paper:
  - https://aclanthology.org/2024.lrec-main.394.pdf
- Project repository:
  - https://github.com/uhh-lt/german-news-quotation-attribution-2024

## Benchmark Task Usage

- Task 3: Span Classification

## Dataset Size (Current Files)

- `german_quotations_test.parquet`: 998 samples
- `german_direct_quotations.parquet`: 434 samples

## How We Preprocess It

Preprocessing is implemented in `quotation_attribution_creation.ipynb`.

Main steps:

1. Iterate all `.pretty.json` files from `train/`, `dev/`, and `test/`.
2. Flatten token streams from each document.
3. Derive token-level labels for quote/speaker attribution.
4. Build sequence tag arrays per document.
5. Track documents without quote annotations (`isempty`).
6. Build:
   - a test evaluation file
   - a larger training-oriented file that keeps all non-empty docs plus a sampled subset of empty docs
7. Export Parquet outputs.

## Final Dataset Structure

### File: `german_quotations_test.parquet`

- `tokens`: token sequence
- `tags`: token-level label sequence

### File: `german_direct_quotations.parquet`

- `tokens`: token sequence
- `tags`: token-level label sequence
- `isempty`: whether no quote span is present in the sample
- `__index_level_0__`: pandas index artifact

## Available Tags In The Final Files

### `german_quotations_test.parquet`

Observed string tag values in `tags`:

- `O`
- `speaker`
- `quote`

### `german_direct_quotations.parquet`

Observed integer tag values in `tags`:

- `0`
- `1`
- `2`

Coarse mapping used in preprocessing:

- `0` -> `O`
- `1` -> `speaker`
- `2` -> `quote`
