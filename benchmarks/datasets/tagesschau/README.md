# Tagesschau 2018-2023 (Benchmark Dataset)

## What Is This Dataset About?

German news articles from Tagesschau, used for topic/document classification.

The benchmark preprocessing derives hierarchical topic labels from article URLs.

## Where Can It Be Found?

- Hugging Face dataset:
  - https://huggingface.co/datasets/bjoernp/tagesschau-2018-2023

## Links (Website / Download / Citation)

- Dataset card:
  - https://huggingface.co/datasets/bjoernp/tagesschau-2018-2023

## Benchmark Task Usage

- Task 1: Document Classification

## Dataset Size (Current Files)

- `tagesschau_cleaned.parquet` (main benchmark file): 11473 samples

## How We Preprocess It

Preprocessing is implemented in `tagesschau_dataset_creation.ipynb`.

Main steps:

1. Load raw Parquet directly from Hugging Face storage.
2. Derive URL depth (`count`) from `link` and filter to expected structure.
3. Parse URL path segments into:
   - `main_tag`
   - `sub_tag`
4. Remove predefined noisy/unwanted tags and subtags.
5. Build a merged label field `tag`.
6. Export cleaned dataset to `tagesschau_cleaned.parquet`.

## Final Dataset Structure

### File: `tagesschau_cleaned.parquet`

- `date`
- `headline`
- `short_headline`
- `short_text`
- `article`
- `link`
- `main_tag`
- `sub_tag`
- `tag`
- `__index_level_0__` (pandas index artifact)

## Label Space (Most Important)

### `main_tag` classes (4)

- `ausland` (5800)
- `wirtschaft` (3202)
- `inland` (1935)
- `wissen` (536)

### `sub_tag` classes (20)

- `europa` (2860)
- `asien` (1370)
- `innenpolitik` (1256)
- `amerika` (1226)
- `unternehmen` (1160)
- `verbraucher` (667)
- `gesellschaft` (550)
- `weltwirtschaft` (502)
- `konjunktur` (307)
- `technologie` (302)
- `afrika` (282)
- `finanzen` (279)
- `klima` (241)
- `gesundheit` (144)
- `deutschlandtrend` (102)
- `forschung` (97)
- `ozeanien` (62)
- `boerse` (39)
- `mittendrin` (27)

### `tag` classes (20)

- `ausland/europa` (2860)
- `ausland/asien` (1370)
- `inland/innenpolitik` (1256)
- `ausland/amerika` (1226)
- `wirtschaft/unternehmen` (1160)
- `wirtschaft/verbraucher` (667)
- `inland/gesellschaft` (550)
- `wirtschaft/weltwirtschaft` (502)
- `wirtschaft/konjunktur` (307)
- `ausland/afrika` (282)
- `wirtschaft/finanzen` (279)
- `wirtschaft/technologie` (248)
- `wissen/klima` (241)
- `wissen/gesundheit` (144)
- `inland/deutschlandtrend` (102)
- `wissen/forschung` (97)
- `ausland/ozeanien` (62)
- `wissen/technologie` (54)
- `wirtschaft/boerse` (39)
- `inland/mittendrin` (27)
