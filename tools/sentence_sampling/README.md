# Sentence Sampling

Scripts that draw the validation sample of sentences from a DATS project. The steps run in this order, each one reads the files of the step before:

1. `export_sentences.py` exports every sentence of the project through the DATS API.
2. `draw_sample.py` draws the three samples from the export.

All files are written to `data/`, which is not committed.

## Installation

Python 3.11 or newer:

```bash
pip install -r requirements.txt
```

## Export the sentences

`export_sentences.py` writes every sentence of the finished text documents of a project to `data/sentence_export_project_<project_id>.csv`, one row per sentence, sorted by `sdoc_id` and `sentence_idx`:

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
DATS_PASSWORD=... python export_sentences.py --backend_url https://dats.example.org/api/ --project_id 49 --username me@example.org
```

Without `DATS_PASSWORD` the script asks for the password. `--year_key` (default `year`) names the metadata key of the year, `--workers` (default 4) the number of parallel requests.

## Draw the sample

`draw_sample.py` draws three samples from the export. The draw is binding: it is run once, with a seed chosen beforehand, and its log is kept.

```bash
python draw_sample.py --input data/sentence_export_project_43.csv --seed <seed>
```

It writes `data/sentence_sample_project_<project_id>.csv` and `data/sentence_sample_project_<project_id>.log.json`, and refuses to replace an existing sample unless `--overwrite` is given.

### The frame

The frame is the set of sentences every draw starts from: the sentences of the export

1. with a year (documents without one are listed in the export manifest),
2. whose decade is one of `--decades` (default the 8 decades 1880 to 1950), where the decade of a year is `year // 10 * 10`, so 1880 means 1880-1889,
3. with at least `--min_words` words (default 5), where a word is a whitespace-separated token with at least one letter, so very short OCR fragments, page numbers and table rows are left out.

The script checks the SHA-256 of the export against its manifest and stops if a decade has no sentences.

### Matching

- **Fresh**: a sentence contains "fresh" as a case-insensitive substring, so "Fresh", "freshly", "freshness" and "refresh" match.
- **Proxy**: a sentence contains a form of a term of the proxy list as a whole word, case-insensitive. The words of a multi-word form may be separated by whitespace or hyphens ("just picked", "just-picked"), and a hyphen ends a word ("harvest-time" matches "harvest"). The column `matched_proxy_terms` names the list terms that matched.

The proxy list is the input file `proxy_terms.json` (`--proxy_terms`): it maps each term the project agreed on to the word forms that count for it. The forms were expanded from the agreed terms by these rules:

- Inflections and derived words of the same stem and meaning count: "crisp" also matches "crispy", "crisply" and "crispness", "healthy" also matches "health" and "healthful", "harvested" also matches "harvest" and "harvesting".
- Negated forms do not count ("unnatural", "unhealthy"); "unprocessed" is a term of its own.
- Words of a different lemma or meaning do not count: "finest" matches "finer" but not "fine", "natural" does not match "nature", and "tenderloin" is not a form of "tender".

Whole words keep out unrelated words that contain a term ("strawberry" and "drawer" do not match "raw", "bartender" does not match "tender"). Broad forms still match in other senses ("raw materials", "legal tender", "Board of Health"); the proxy draw is a candidate pool, not a classification. To change the list, edit the file before the draw; its SHA-256 and content are logged.

### The draws

| Draw           | Pool                                                                | Default size         |
| -------------- | ------------------------------------------------------------------- | -------------------- |
| 1 `background` | the whole frame                                                     | `--n_background` 100 |
| 2 `proxy`      | frame sentences with a proxy term and without "fresh", minus Draw 1 | `--n_proxy` 200      |
| 3 `fresh`      | frame sentences with "fresh", minus Draw 1                          | `--n_fresh` 100      |

- A sentence with "fresh" and a proxy term belongs to the fresh pool only, so the proxy sample holds the sentences that may express freshness without the word.
- Draws 2 and 3 leave out the sentences of Draw 1. Their pools are disjoint, so no sentence is drawn twice and their order does not matter.
- Every draw is stratified by decade with an **equal** number per decade, not proportional to the size of the decade: 100 sentences over 8 decades are 12 or 13 per decade. The decades that get one more (when the size does not divide equally) are chosen at random. A decade whose pool has fewer sentences than its share gives all of them, and the rest is split equally over the other decades. The script stops if a pool has fewer sentences than the draw needs.
- Within a decade, every sentence of the pool has the same chance (uniform sampling without replacement).
- Because of the equal allocation, small decades are over-represented: a rate estimated from a draw must be weighted by the decade sizes of its pool, which the log records.

### Reproducibility

The draw depends only on the export, `proxy_terms.json`, the parameters and `--seed`. The seed is split with `numpy.random.SeedSequence` into one random generator per draw, and the pools are sorted by `sdoc_id` and `sentence_idx` before drawing, so the same inputs and versions give the same sample. Text is matched with Python's `re`.

The log records the SHA-256 of the export, of `proxy_terms.json` and of the sample, the proxy list, the seed, the parameters, the frame counts (exported, dropped without year, outside the decades and too short, and per decade), for every draw the pool size and the number drawn per decade, and the Python, numpy and pandas versions.

### The sample

`sentence_sample_project_<project_id>.csv` holds the drawn sentences, the background draw first, then proxy, then fresh, each sorted by decade, `sdoc_id` and `sentence_idx`. It holds no model labels.

| Column                                            | Content                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `draw`                                            | `background`, `proxy` or `fresh`              |
| `sentence_uid`, `sdoc_id`, `sentence_idx`, `year` | as in the export                              |
| `decade`                                          | first year of the decade                      |
| `n_words`                                         | number of words, as counted for `--min_words` |
| `contains_fresh`                                  | whether the sentence contains "fresh"         |
| `matched_proxy_terms`                             | the proxy terms that matched, `;`-separated   |
| `sentence_text`                                   | the sentence                                  |
