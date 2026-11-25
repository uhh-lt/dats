# Sentence Sampling

Scripts that draw samples of sentences from a DATS project and assign them to annotator pairs. The steps run in this order, each one reads the files of the step before:

1. `export_sentences.py` exports every sentence of the project through the DATS API.
2. `draw_sample.py` draws the sample from the export, as `sample.json` defines it.
3. `assign_annotators.py` assigns the drawn sentences to annotator pairs and writes the DATS import file that marks them.

Every sample has its own **data folder** (`--data_dir`, default `data/`) that holds all its inputs and outputs: `sample.json` and its term lists, `annotators.json`, the export, the sample and the assignment. Folders named `data*` (`data/`, `data-sample2/`, ...) are not committed. `examples/` holds the configurations of the samples drawn so far, to copy into a new data folder.

[WALKTHROUGH.md](WALKTHROUGH.md) explains step by step how to run them and what to check; this README describes how they work and why.

## Installation

Python 3.11 or newer:

```bash
pip install -r requirements.txt
```

## Export the sentences

`export_sentences.py` writes every sentence of the finished text documents of a project to `<data_dir>/sentence_export_project_<project_id>.csv`, one row per sentence, sorted by `sdoc_id` and `sentence_idx`:

| Column          | Content                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| `sentence_uid`  | `<sdoc_id>:<sentence_idx>`, unique in the project                                   |
| `sdoc_id`       | ID of the source document                                                           |
| `sentence_idx`  | 0-based number of the sentence in its document, as DATS sentence annotations use it |
| `n_sentences`   | number of sentences of the document                                                 |
| `year`          | year of the document, from the metadata key `--year_key` (empty if it has none)     |
| `sdoc_name`     | name of the source document                                                         |
| `sdoc_filename` | filename of the source document                                                     |
| `sentence_text` | the sentence                                                                        |

Next to the CSV, `sentence_export_project_<project_id>.manifest.json` records the backend, the export time, the SHA-256 of the CSV, the counts and the IDs of the documents that have no year or no sentences or were left out (non-text, still processing or erroneous).

```bash
DATS_PASSWORD=... python export_sentences.py --backend_url https://dats.example.org/api/ --project_id 43 --username me@example.org --data_dir data
```

Without `DATS_PASSWORD` the script asks for the password. `--year_key` (default `year`) names the metadata key of the year, `--workers` (default 4) the number of parallel requests.

The year key must be a text metadata key of type NUMBER or STRING (`YYYY`). DATS stores an unset value instead of none: 0 for a number and an empty string for a string, so both count as no year. A DATE key is refused, because DATS fills an unset date with the day the value was created, which cannot be told apart from a real date.

Several samples of one project can share an export: copy the CSV and its manifest into the new data folder.

## Draw the sample

`draw_sample.py` draws the sample that `<data_dir>/sample.json` defines from the export in the data folder. The draw is binding: it is run once, with a seed chosen beforehand, and its log is kept.

```bash
python draw_sample.py --data_dir data --project_id 43 --seed <seed>
```

It writes `<data_dir>/sentence_sample_project_<project_id>.csv` and its `.log.json`, and refuses to replace an existing sample unless `--overwrite` is given.

### sample.json

```json
{
  "decades": [1880, 1890, 1900, 1910, 1920, 1930, 1940],
  "min_words": 5,
  "draws": [
    { "name": "background", "n": 100 },
    {
      "name": "proxy",
      "n": 200,
      "terms": "proxy_terms.json",
      "exclude": ["fresh"]
    },
    { "name": "fresh", "n": 100, "substring": "fresh" }
  ]
}
```

| Key         | Meaning                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `decades`   | the decades of the frame                                                                                  |
| `min_words` | the minimum number of words of a sentence in the frame                                                    |
| `draws`     | the draws, in the order they are drawn                                                                    |
| `name`      | the name of the draw (lowercase, digits and `_`), in the `draw` column of the sample                      |
| `n`         | the number of sentences to draw                                                                           |
| `terms`     | optional: a term list in the data folder; the pool holds only sentences with one of its words             |
| `substring` | optional: the pool holds only sentences that contain this text                                            |
| `exclude`   | optional: names of other draws with `terms` or `substring`; sentences that match them are not in the pool |

A draw without `terms` and `substring` draws from the whole frame.

### The frame

The frame is the set of sentences every draw starts from: the sentences of the export

1. with a year (documents without one are listed in the export manifest),
2. whose decade is one of `decades`, where the decade of a year is `year // 10 * 10`, so 1880 means 1880-1889,
3. with at least `min_words` words, where a word is a whitespace-separated token with at least one letter, so very short OCR fragments, page numbers and table rows are left out.

The script checks the SHA-256 of the export against its manifest and stops if a decade has no sentences.

### Matching

- **Substring**: a sentence contains the substring, case-insensitive: "fresh" matches "Fresh", "freshly", "freshness" and "refresh".
- **Terms**: a sentence contains a word form of the term list as a whole word, case-insensitive. The words of a multi-word form may be separated by whitespace or hyphens ("just picked" matches "just-picked", "cold store" matches "cold-store"), and a hyphen ends a word ("harvest-time" matches "harvest"). Whole words keep out unrelated words that contain a form ("strawberry" does not match "raw", "bartender" does not match "tender").

A term list maps each term the project agreed on to the word forms that count for it, for example `{"thaw": ["thaw", "thaws", "thawed", "thawing"]}`. Forms are matched as written, without part of speech, so a form also matches in other senses ("raw materials", "a cool place", "a chill" as an illness): a term draw is a candidate pool, not a classification. Edit the list before the draw; its SHA-256 and content are logged.

The sample has a column `matches_<name>` for every draw with `terms` or `substring`: the terms (`;`-separated) or the substring the sentence matches, empty if none.

### The draws

- The draws run in the order of `sample.json`, and every draw leaves out the sentences of the draws before it, so no sentence is drawn twice. A sentence that matches two draws without `exclude` can be drawn by either.
- Every draw is stratified by decade with an **equal** number per decade, not proportional to the size of the decade: 100 sentences over 7 decades are 14 or 15 per decade. The decades that get one more (when the size does not divide equally) are chosen at random. A decade whose pool has fewer sentences than its share gives all of them, and the rest is split equally over the other decades. The script stops if a pool has fewer sentences than the draw needs.
- Within a decade, every sentence of the pool has the same chance (uniform sampling without replacement).
- Because of the equal allocation, small decades are over-represented: a rate estimated from a draw must be weighted by the decade sizes of its pool, which the log records.

### Reproducibility

The draw depends only on the export, `sample.json`, its term lists and `--seed`. The seed is split with `numpy.random.SeedSequence` into one random generator per draw, in the order of the draws, and the pools are sorted by `sdoc_id` and `sentence_idx` before drawing, so the same inputs and versions give the same sample. Text is matched with Python's `re`.

The log records the SHA-256 of the export, of `sample.json`, of every term list and of the sample, the content of `sample.json` and the term lists, the seed, the frame counts (exported, dropped without year, outside the decades and too short, and per decade), for every draw its size, the pool size and the number drawn per decade, and the Python, numpy and pandas versions.

### The sample

`sentence_sample_project_<project_id>.csv` holds the drawn sentences, draw by draw in the order of `sample.json`, each sorted by decade, `sdoc_id` and `sentence_idx`. It holds no model labels.

| Column                                                             | Content                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `draw`                                                             | the name of the draw                                       |
| `sentence_uid`, `sdoc_id`, `sentence_idx`, `sdoc_filename`, `year` | as in the export                                           |
| `decade`                                                           | first year of the decade                                   |
| `n_words`                                                          | number of words, as counted for `min_words`                |
| `matches_<name>`                                                   | per draw with a criterion: what of it the sentence matches |
| `sentence_text`                                                    | the sentence                                               |

## The examples

### `examples/fresh_validation`: validation of freshness

| Draw         | Pool                                                         | Size |
| ------------ | ------------------------------------------------------------ | ---- |
| `background` | the whole frame                                              | 100  |
| `proxy`      | sentences with a term of `proxy_terms.json`, without "fresh" | 200  |
| `fresh`      | sentences that contain "fresh"                               | 100  |

- A sentence with "fresh" and a proxy term belongs to the fresh pool only, so the proxy sample holds the sentences that may express freshness without the word.
- The proxy and fresh pools leave out the background sentences.
- The forms of `proxy_terms.json` were expanded from the agreed terms by these rules: inflections and derived words of the same stem and meaning count ("crisp" also matches "crispy", "crisply" and "crispness", "healthy" also "health" and "healthful", "harvested" also "harvest" and "harvesting"); negated forms do not ("unnatural", "unhealthy"; "unprocessed" is a term of its own); words of a different lemma or meaning do not ("finest" matches "finer" but not "fine", "natural" does not match "nature", "tenderloin" is not a form of "tender").

### `examples/cold_storage`: cooling and freezing

| Draw       | Pool                                           | Size |
| ---------- | ---------------------------------------------- | ---- |
| `cooling`  | sentences with a term of `cooling_terms.json`  | 200  |
| `freezing` | sentences with a term of `freezing_terms.json` | 200  |

- `cooling_terms.json`: the verbs refrigerate, chill and cool and the nouns refrigerator, icebox, cooler and cold-store.
- `freezing_terms.json`: the verbs freeze and thaw and the noun freezer.
- The forms are the inflections of every term (verbs: -s, -ed, -ing and irregular forms like "froze", "frozen"; nouns: the plural), plus the action noun "refrigeration", the spellings "ice box" and "ice-box", and "cold storage". Words of a different lemma do not count ("fridge", "chilly", "frost").
- Words are matched without part of speech: "cool" and "cooler" also match the adjective ("a cool place"), "chill" the illness, "freezer" the ice-cream freezer.
- There is no background draw, and the pools do not exclude each other: a sentence with a cooling and a freezing word can be drawn by either draw, but only once. Add `"exclude": ["cooling"]` to the freezing draw (and the reverse) for pools without such sentences.

## Assign the annotators

`assign_annotators.py` gives every drawn sentence to two annotators and writes a file that DATS imports to mark each sentence for both of them.

Before the first run:

1. Copy `annotators.example.json` to `<data_dir>/annotators.json` and fill in the DATS emails. The data folder is not committed, so the emails are not either. The order of the annotators decides the pairs.
2. Create the code `SELECTED` in the project (`--code_name` names another one).
3. Add the five annotators to the project.

The script checks the last two in DATS and stops with a warning if the code is missing or an annotator is not a member of the project.

```bash
DATS_PASSWORD=... python assign_annotators.py --data_dir data --project_id 43 --seed <seed> --backend_url https://dats.example.org/api/ --username me@example.org
```

### The assignment

- **Pairs**: the five annotators make 10 pairs (every pair once, in the order of `annotators.json`: A-B, A-C, A-D, A-E, B-C, ...), and pair `b` annotates block `b`. Every sentence is annotated by exactly two people, everybody works with everybody exactly once, and everybody annotates 4 blocks.
- **Blocks**: every draw is split at random into 10 equal parts and block `b` gets part `b` of every draw, so every pair sees the same mix of draws and the agreement of the pairs is comparable. The size of every draw must be a multiple of the number of pairs.
- **Numbering**: the sentences of a block are shuffled and numbered block by block (block 1 is 1-40, block 2 is 41-80, ...), so the number tells nothing about the draw.
- **Blinding**: all sentences get the same code, whatever their draw. Only the assignment file names the draw; it is for the person who drew and the statistics, not for the annotators.
- **Reproducibility**: `--seed` drives all shuffles; the annotation UUIDs are derived from the project, the code, the sentence and the annotator, so the same inputs give the same files, and DATS refuses to import the same annotations twice.
- **Several samples in one project**: give every sample its own code (`--code_name SELECTED_2`), so that the annotators can tell the samples apart and a sentence drawn twice gets two annotations.

### The output

| File                                                     | Rows             | Content                                                                                                                                                                                |
| -------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignment_project_<project_id>.csv`                    | one per sentence | `number`, `block`, `annotator_1`, `annotator_2`, `draw` and the sample columns                                                                                                         |
| `selected_sentence_annotations_project_<project_id>.csv` | two per sentence | the DATS sentence annotation import: `uuid`, `sdoc_name` (the filename of the document), `user_email`, `code_name`, `text_begin_sent` and `text_end_sent` (the `sentence_idx`), `text` |
| `assignment_project_<project_id>.log.json`               |                  | the SHA-256 of the sample and of both files, the seed, the code, per block its numbers, pair and sentences per draw, per annotator the blocks and numbers                              |

The script prints the numbers of every annotator and refuses to replace an existing assignment unless `--overwrite` is given.

Import `selected_sentence_annotations_project_<project_id>.csv` in DATS under Project Settings, Import, sentence annotations. Every annotator then finds their sentences in their own annotations under the code. DATS v1.14.0 and older run the span annotation import for this file and fail.
