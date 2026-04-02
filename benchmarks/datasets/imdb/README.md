# IMDB Genres (Benchmark Dataset)

## What Is This Dataset About?

This dataset contains movie descriptions and genre labels for document classification.

It is used as a multi-label/multi-class style topic categorization dataset in the benchmark context.

## Where Can It Be Found?

- Hugging Face dataset:
  - https://huggingface.co/datasets/jquigl/imdb-genres

## Links (Website / Download / Citation)

- Dataset card:
  - https://huggingface.co/datasets/jquigl/imdb-genres

## Benchmark Task Usage

- Task 1: Document Classification

## Dataset Size (Current Files)

- `imdb_cleaned.parquet` (main benchmark file): 29756 samples

## How We Preprocess It

Preprocessing is implemented in `imdb_dataset_creation.ipynb`.

Main steps:

1. Load source data from Hugging Face export.
2. Inspect and normalize genre-related columns.
3. Remove the `Adult` genre from `expanded-genres` for cleaner label space.
4. Save processed output to `imdb_cleaned.parquet`.

## Final Dataset Structure

### File: `imdb_cleaned.parquet`

- `movie title - year`
- `genre`
- `expanded-genres`
- `rating`
- `description`

## Label Space (Most Important)

### `genre` values (16)

- `Action`
- `Adventure`
- `Animation`
- `Biography`
- `Crime`
- `Family`
- `Fantasy`
- `Film-noir`
- `History`
- `Horror`
- `Mystery`
- `Romance`
- `Scifi`
- `Sports`
- `Thriller`
- `War`

### `expanded-genres` values after cleaning (25)

- `Action`
- `Adventure`
- `Animation`
- `Biography`
- `Comedy`
- `Crime`
- `Drama`
- `Family`
- `Fantasy`
- `Film-Noir`
- `Game-Show`
- `History`
- `Horror`
- `Music`
- `Musical`
- `Mystery`
- `News`
- `Reality-TV`
- `Romance`
- `Sci-Fi`
- `Sport`
- `Talk-Show`
- `Thriller`
- `War`
- `Western`
