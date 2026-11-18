# Walkthrough

Step by step from an imported DATS project to the `SELECTED` sentence annotations of the annotators: which script to run when, what to prepare and what to check. Why the scripts work as they do is in [README.md](README.md).

Replace these placeholders in every command:

| Placeholder     | Meaning                                                   | Example                  |
| --------------- | --------------------------------------------------------- | ------------------------ |
| `<BACKEND_URL>` | the DATS API URL, as seen from the machine running this   | `http://localhost:6120/` |
| `<USERNAME>`    | a DATS account that is a member of the project            | `SYSTEM@dats.org`        |
| `<PROJECT_ID>`  | the DATS project                                          | `43`                     |
| `<DRAW_SEED>`   | seed of the draw, any integer, fixed and noted beforehand | `20261119`               |
| `<ASSIGN_SEED>` | seed of the assignment, another integer                   | `20261123`               |

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

All commands below run in `tools/sentence_sampling`, all files land in `data/`.

## 1. Export all sentences

Wait until DATS has finished processing every document of the project (none processing or erroneous), then:

```bash
python export_sentences.py --backend_url <BACKEND_URL> --project_id <PROJECT_ID> --username <USERNAME>
```

It takes a while (two requests per document) and writes `data/sentence_export_project_<PROJECT_ID>.csv` and its `.manifest.json`. Check the counts:

```bash
python -c "import json; m = json.load(open('data/sentence_export_project_<PROJECT_ID>.manifest.json')); print(json.dumps(m['counts'], indent=2))"
```

- [ ] `skipped_processing_documents` and `skipped_erroneous_documents` are 0. Otherwise wait or fix the documents in DATS and export again.
- [ ] `documents_without_year` is 0. Otherwise the IDs are under `sdoc_ids.without_year` in the manifest: add their year and export again.
- [ ] `exported_sentences` is plausible.

The export is the frozen frame of the sample: keep the CSV and its manifest, and do not export again after drawing.

## 2. Draw the sample

`proxy_terms.json` must be final before the draw: check it with the team. Changing it later means drawing again.

```bash
python draw_sample.py --input data/sentence_export_project_<PROJECT_ID>.csv --seed <DRAW_SEED>
```

It writes `data/sentence_sample_project_<PROJECT_ID>.csv` (100 background, 200 proxy, 100 fresh sentences) and its `.log.json`. Check the frame and the draws:

```bash
python -c "import json; l = json.load(open('data/sentence_sample_project_<PROJECT_ID>.log.json')); print(json.dumps({'frame': l['frame'], 'drawn': {d: v['drawn_per_decade'] for d, v in l['draws'].items()}}, indent=2))"
```

- [ ] `dropped_outside_decades` is small. The default decades are 1880 to 1950; if the corpus has others, agree on them with the team and draw again with `--decades ...` and `--overwrite`.
- [ ] `dropped_too_short` (fewer than 5 words) looks reasonable.
- [ ] Every decade has 12-13 background and fresh and 25 proxy sentences. Fewer in a decade means its pool was too small, and the other decades got the rest.

If the script stops with `Cannot draw ... from a pool of ...`, a pool is smaller than the draw: decide with the team before changing `--n_proxy` or `--n_fresh`.

## 3. Prepare DATS and the annotators

In the DATS project:

- [ ] Create a code named exactly `SELECTED`, the same for every drawn sentence.
- [ ] Add the five annotator accounts as members. The person who drew does not annotate.

Fill in the emails:

```bash
cp annotators.example.json data/annotators.json
nano data/annotators.json   # replace every REPLACE-...@example.org with the DATS email
```

The order of the annotators decides the pairs. `data/` is not committed, so the emails stay on this machine.

## 4. Assign the annotators

```bash
python assign_annotators.py --input data/sentence_sample_project_<PROJECT_ID>.csv --seed <ASSIGN_SEED> --backend_url <BACKEND_URL> --username <USERNAME>
```

It first checks DATS and stops with a `WARNING` if `SELECTED` is missing or an annotator is not a member: fix that in DATS and run it again. It prints the sentence numbers of every annotator; with the order of `annotators.example.json`:

| Annotator | Sentences                         |
| --------- | --------------------------------- |
| A         | 1-160                             |
| B         | 1-40, 161-280                     |
| C         | 41-80, 161-200, 281-360           |
| D         | 81-120, 201-240, 281-320, 361-400 |
| E         | 121-160, 241-280, 321-400         |

It writes:

- `data/assignment_project_<PROJECT_ID>.csv`: every sentence with its number, block, both annotators **and its draw**. Only for the person who drew and the statistics, never for the annotators.
- `data/selected_sentence_annotations_project_<PROJECT_ID>.csv`: the DATS import, two rows per sentence.
- `data/assignment_project_<PROJECT_ID>.log.json`

## 5. Import the SELECTED annotations

This needs a DATS version with the fix of issue #872: up to v1.14.0 the sentence annotation import runs the span annotation import and fails on this file.

- [ ] In DATS, open the project, Project Settings, Import, **sentence annotations**, and upload `data/selected_sentence_annotations_project_<PROJECT_ID>.csv`.
- [ ] The import job finishes without errors. A second import of the same file is refused, because the annotation IDs exist already.
- [ ] Check a few sentences of the assignment file: their two annotators, and only they, have a `SELECTED` sentence annotation; every annotator has 160.

## 6. Keep the record

Archive together, they document the sample:

- `data/sentence_export_project_<PROJECT_ID>.csv` (the frame) and its `.manifest.json`
- `data/sentence_sample_project_<PROJECT_ID>.csv` and its `.log.json`
- `data/assignment_project_<PROJECT_ID>.csv` and its `.log.json`
- `data/selected_sentence_annotations_project_<PROJECT_ID>.csv`
- `proxy_terms.json` and the commit of the tool: `git rev-parse HEAD`

Every log holds the SHA-256 of its input, so the chain from export to sample to assignment can be verified later.
