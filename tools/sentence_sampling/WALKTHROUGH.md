# Walkthrough

Step by step from an imported DATS project to the sentence annotations that mark a sample for its annotators: which script to run when, what to prepare and what to check. Why the scripts work as they do is in [README.md](README.md).

Replace these placeholders in every command:

| Placeholder     | Meaning                                                   | Example                  |
| --------------- | --------------------------------------------------------- | ------------------------ |
| `<BACKEND_URL>` | the DATS API URL, as seen from the machine running this   | `http://localhost:6120/` |
| `<USERNAME>`    | a DATS account that is a member of the project            | `SYSTEM@dats.org`        |
| `<PROJECT_ID>`  | the DATS project                                          | `43`                     |
| `<DATA_DIR>`    | the data folder of this sample, one per sample            | `data-sample2`           |
| `<EXAMPLE>`     | the example in `examples/` the sample is based on         | `cold_storage`           |
| `<CODE>`        | the code that marks the sentences, one per sample         | `SELECTED_2`             |
| `<DRAW_SEED>`   | seed of the draw, any integer, fixed and noted beforehand | `20261124`               |
| `<ASSIGN_SEED>` | seed of the assignment, another integer                   | `20261125`               |

## 0. Before you start

- [ ] Every document of the project has its year as metadata (key `year`, otherwise pass `--year_key` to the export). If it is missing, add it with `tools/importer/dats_importer_metadata.py`.
- [ ] Python 3.11 or newer: `python3 --version`.
- [ ] Choose `<DRAW_SEED>` and `<ASSIGN_SEED>` **before** drawing and note them in the project notes. Never draw again with another seed because you dislike a sample.
- [ ] Have the DATS emails of the five annotators.

In a checkout of the DATS repository:

```bash
cd tools/sentence_sampling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set the password once per shell, so that it is not in the shell history:

```bash
read -s -p "DATS password: " DATS_PASSWORD && export DATS_PASSWORD
```

All commands below run in `tools/sentence_sampling`.

## 1. Set up the data folder

Every sample gets its own data folder; folders named `data*` are not committed. Copy the configuration of the example into it:

```bash
mkdir <DATA_DIR>
cp examples/<EXAMPLE>/* <DATA_DIR>/
cp annotators.example.json <DATA_DIR>/annotators.json
```

- [ ] `<DATA_DIR>/sample.json` defines the draws: their order, sizes, term lists and exclusions, the decades and the minimum words. Check it with the team.
- [ ] The term lists in `<DATA_DIR>` (`*_terms.json`) hold the word forms that count for every term. Check them with the team.
- [ ] In `<DATA_DIR>/annotators.json`, replace every `REPLACE-...@example.org` with the DATS email. The order of the annotators decides the pairs.

All of it must be final before the draw: changing it later means drawing again.

If an earlier sample of the project has an export, reuse it instead of step 2: copy `sentence_export_project_<PROJECT_ID>.csv` and its `.manifest.json` into `<DATA_DIR>`.

## 2. Export all sentences

Wait until DATS has finished processing every document of the project (none processing or erroneous), then:

```bash
python export_sentences.py --backend_url <BACKEND_URL> --project_id <PROJECT_ID> --username <USERNAME> --data_dir <DATA_DIR>
```

It takes a while (two requests per document) and writes `<DATA_DIR>/sentence_export_project_<PROJECT_ID>.csv` and its `.manifest.json`. Check the counts:

```bash
python -c "import json; m = json.load(open('<DATA_DIR>/sentence_export_project_<PROJECT_ID>.manifest.json')); print(json.dumps(m['counts'], indent=2))"
```

- [ ] `skipped_processing_documents` and `skipped_erroneous_documents` are 0. Otherwise wait or fix the documents in DATS and export again.
- [ ] `documents_without_year` is 0. Otherwise the IDs are under `sdoc_ids.without_year` in the manifest: add their year and export again.
- [ ] `exported_sentences` is plausible.

The export is the frozen frame of the sample: keep the CSV and its manifest, and do not export again after drawing.

## 3. Draw the sample

```bash
python draw_sample.py --data_dir <DATA_DIR> --project_id <PROJECT_ID> --seed <DRAW_SEED>
```

It writes `<DATA_DIR>/sentence_sample_project_<PROJECT_ID>.csv` and its `.log.json`. Check the frame and the draws:

```bash
python -c "import json; l = json.load(open('<DATA_DIR>/sentence_sample_project_<PROJECT_ID>.log.json')); print(json.dumps({'frame': l['frame'], 'pool': {d: v['pool_per_decade'] for d, v in l['draws'].items()}, 'drawn': {d: v['drawn_per_decade'] for d, v in l['draws'].items()}}, indent=2))"
```

- [ ] `dropped_outside_decades` is small. If the corpus has other decades, agree on them with the team, change `decades` in `sample.json` and draw again with `--overwrite`.
- [ ] `dropped_too_short` (fewer than `min_words` words) looks reasonable.
- [ ] Every draw has about the same number of sentences in every decade. Fewer in a decade means its pool was too small, and the other decades got the rest.

If the script stops with `Cannot draw ... from a pool of ...`, a pool is smaller than its draw: decide with the team before changing `sample.json`.

## 4. Prepare DATS

In the DATS project:

- [ ] Create a code named exactly `<CODE>`. Use a new code for every sample (`SELECTED`, `SELECTED_2`, ...), so that the annotators can tell the samples apart.
- [ ] Add the five annotator accounts as members. The person who drew does not annotate.

## 5. Assign the annotators

```bash
python assign_annotators.py --data_dir <DATA_DIR> --project_id <PROJECT_ID> --seed <ASSIGN_SEED> --code_name <CODE> --backend_url <BACKEND_URL> --username <USERNAME>
```

It first checks DATS and stops with a `WARNING` if `<CODE>` is missing or an annotator is not a member: fix that in DATS and run it again. It prints the sentence numbers of every annotator; for 400 sentences with the order of `annotators.example.json`:

| Annotator | Sentences                         |
| --------- | --------------------------------- |
| A         | 1-160                             |
| B         | 1-40, 161-280                     |
| C         | 41-80, 161-200, 281-360           |
| D         | 81-120, 201-240, 281-320, 361-400 |
| E         | 121-160, 241-280, 321-400         |

It writes:

- `<DATA_DIR>/assignment_project_<PROJECT_ID>.csv`: every sentence with its number, block, both annotators **and its draw**. Only for the person who drew and the statistics, never for the annotators.
- `<DATA_DIR>/selected_sentence_annotations_project_<PROJECT_ID>.csv`: the DATS import, two rows per sentence.
- `<DATA_DIR>/assignment_project_<PROJECT_ID>.log.json`

## 6. Import the annotations

This needs DATS v1.14.1 or newer: older versions run the span annotation import for this file and fail (issue #872).

- [ ] In DATS, open the project, Project Settings, Import, **sentence annotations**, and upload `<DATA_DIR>/selected_sentence_annotations_project_<PROJECT_ID>.csv`.
- [ ] The import job finishes without errors. A second import of the same file is refused, because the annotation IDs exist already.
- [ ] Check a few sentences of the assignment file: their two annotators, and only they, have a `<CODE>` sentence annotation; every annotator has 160.

## 7. Keep the record

Archive the data folder (without `annotators.json` if the emails must not travel) and the commit of the tool (`git rev-parse HEAD`). It documents the sample: the export and its manifest (the frame), `sample.json` and the term lists, the sample and the assignment with their logs, and the import file. Every log holds the SHA-256 of its inputs, so the chain from export to sample to assignment can be verified later.
