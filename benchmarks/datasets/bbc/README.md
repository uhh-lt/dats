# BBC News Alltime (Benchmark Dataset)

## What Is This Dataset About?

A large-scale BBC news corpus used for topic/document classification.

The raw data contains article metadata and article text. In our benchmark, we derive topic labels from article link/tag structure and create a cleaned classification-ready dataset.

## Where Can It Be Found?

- Hugging Face dataset:
  - https://huggingface.co/datasets/RealTimeData/bbc_news_alltime

## Links (Website / Download / Citation)

- Dataset card:
  - https://huggingface.co/datasets/RealTimeData/bbc_news_alltime

## Benchmark Task Usage

- Task 1: Document Classification

## Dataset Size (Current Files)

- `bbc_cleaned.parquet` (main benchmark file): 81182 samples

## Label Space (Most Important)

The classification labels are derived from URL tags.

### `main_tag` classes (4)

- `uk` (35916)
- `misc` (21268)
- `world` (18642)
- `sport` (5356)

### `sub_tag` classes (26)

- `africa` (918)
- `asia` (2776)
- `athletics` (182)
- `australia` (700)
- `boxing` (158)
- `business` (8026)
- `cricket` (500)
- `education` (1175)
- `election` (614)
- `england` (14475)
- `entertainment` (4776)
- `europe` (6332)
- `football` (3393)
- `formula1` (179)
- `health` (2897)
- `latin-america` (728)
- `middle-east` (1672)
- `northern-ireland` (3433)
- `politics` (7590)
- `rugby` (347)
- `science` (1817)
- `scotland` (5265)
- `technology` (1963)
- `tennis` (597)
- `us` (5516)
- `wales` (5153)

### `tag` classes (26)

- `uk/england` (14475)
- `misc/business` (8026)
- `uk/politics` (7590)
- `world/europe` (6332)
- `world/us` (5516)
- `uk/scotland` (5265)
- `uk/wales` (5153)
- `uk/entertainment` (4776)
- `uk/northern-ireland` (3433)
- `sport/football` (3393)
- `uk/health` (2897)
- `world/asia` (2776)
- `uk/technology` (1963)
- `uk/science` (1817)
- `world/middle-east` (1672)
- `uk/education` (1175)
- `world/africa` (918)
- `world/latin-america` (728)
- `world/australia` (700)
- `uk/election` (614)
- `sport/tennis` (597)
- `sport/cricket` (500)
- `sport/rugby` (347)
- `sport/athletics` (182)
- `sport/formula1` (179)
- `sport/boxing` (158)

## How We Preprocess It

Preprocessing is implemented in `bbc_dataset_creation.ipynb`.

Main steps:

1. Download/concatenate monthly slices (2018-2023) from Hugging Face.
2. Save concatenated raw dataset to `bbc_news_alltime.parquet`.
3. Drop noisy columns (`authors`, `top_image`).
4. Parse article `link` path into hierarchical tags.
5. Derive:
   - `tags`
   - `tags_len`
   - `main_tag`
   - `sub_tag`
   - merged `tag`
6. Filter noisy/rare groups and normalize some sub-tag names.
7. Save cleaned dataset to `bbc_cleaned.parquet`.

## Final Dataset Structure

### File: `bbc_news_alltime.parquet` (raw combined)

- `title`
- `published_date`
- `description`
- `section`
- `content`
- `link`
- `__index_level_0__` (pandas index artifact)

### File: `bbc_cleaned.parquet` (classification-ready)

- `title`
- `published_date`
- `description`
- `section`
- `content`
- `link`
- `count`
- `tags`
- `tags_len`
- `main_tag`
- `sub_tag`
- `tag`
- `__index_level_0__` (pandas index artifact)
