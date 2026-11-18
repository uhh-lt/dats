# Sentence Sampling

Scripts that draw a sentence sample from a DATS project. They read the project through the DATS API and write their files to `data/`, which is not committed.

## Installation

```bash
pip install -r requirements.txt
```

## Export the sentences

`export_sentences.py` writes every sentence of the finished text documents of a project to `data/sentence_export_project_<project_id>.csv`, one row per sentence, sorted by `sdoc_id` and `sentence_idx`:

| Column          | Content                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `sentence_uid`  | `<sdoc_id>:<sentence_idx>`, unique in the project                             |
| `sdoc_id`       | ID of the source document                                                     |
| `sentence_idx`  | 0-based number of the sentence in its document, as DATS sentence annotations use it |
| `n_sentences`   | number of sentences of the document                                           |
| `year`          | year of the document, from the metadata key `--year_key` (empty if it has none) |
| `sdoc_name`     | name of the source document                                                   |
| `sdoc_filename` | filename of the source document                                               |
| `sentence_text` | the sentence                                                                  |

Next to the CSV, `sentence_export_project_<project_id>.manifest.json` records the backend, the export time, the SHA-256 of the CSV, the counts and the IDs of the documents that have no year or no sentences or were left out (non-text, still processing or erroneous).

```bash
DATS_PASSWORD=... python export_sentences.py --backend_url https://dats.example.org/api/ --project_id 49 --username me@example.org
```

Without `DATS_PASSWORD` the script asks for the password. `--year_key` (default `year`) names the metadata key of the year, `--workers` (default 4) the number of parallel requests.
