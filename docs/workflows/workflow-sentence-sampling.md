# Drawing a Sentence Validation Sample

The standalone toolchain in `tools/sentence_sampling` draws a reproducible validation sample of sentences from a DATS project and assigns it to annotator pairs. It talks to DATS only through the API, so it can run against a released DATS version without a local development stack.

By default, the toolchain draws 400 sentences: 100 background sentences, 200 sentences matching proxy terms, and 100 sentences containing “fresh”. It then assigns every sentence to two of five annotators and creates a sentence annotation import that marks the sample with the code `SELECTED`.

The tool's [README](https://github.com/uhh-lt/dats/blob/main/tools/sentence_sampling/README.md) explains the sampling strategy and output formats. Its [step-by-step walkthrough](https://github.com/uhh-lt/dats/blob/main/tools/sentence_sampling/WALKTHROUGH.md) includes the complete checklist and commands.

## Prepare the project and toolchain

Before drawing the sample:

- Wait until every source document has finished processing. The export uses finished text documents only.
- Add a year to every document as text metadata of type `NUMBER` or `STRING` (`YYYY`). The default metadata key is `year`; use `--year_key` for another key. `DATE` keys are refused because DATS fills an unset date with the day it was created, making it indistinguishable from a real date.
- Review and finalize `proxy_terms.json`, and choose separate seeds for the draw and the annotator assignment. Do not draw again with another seed because you dislike the result.
- Create the code `SELECTED` in the project and add the five annotators as project members.

Install the toolchain in a DATS checkout with Python 3.11 or newer:

```bash
cd tools/sentence_sampling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

All commands below run from `tools/sentence_sampling`. Output goes to the git-ignored `data/` directory. The scripts prompt for the DATS password, or read it from `DATS_PASSWORD`.

## 1. Export the sentence frame

```bash
python export_sentences.py --backend_url <BACKEND_URL> --project_id <PROJECT_ID> --username <USERNAME>
```

The export contains one row per sentence, including its source document ID, zero-based sentence index, year, filename, and text. Unset numeric years (`0`) and empty strings count as missing years. The manifest records document counts, omitted documents, and the CSV's SHA-256. Check the manifest for processing or erroneous documents and documents without a year before continuing. Keep the export and manifest together as the frozen sampling frame.

## 2. Draw the sample

```bash
python draw_sample.py --input data/sentence_export_project_<PROJECT_ID>.csv --seed <DRAW_SEED>
```

The sampling frame keeps sentences with a year in the selected decades and at least five words. By default, each draw is stratified equally over the eight decades from 1880 through 1950, rather than proportionally to decade size. Proxy terms match as whole words; “fresh” matches as a case-insensitive substring. The proxy pool excludes sentences containing “fresh”, and both later draws exclude the background sample.

The seeded draw writes the sample CSV and a log containing the parameters, input hashes, frame counts, and pool and draw sizes per decade. These counts are needed to weight estimates because equal allocation over-represents smaller decades.

## 3. Assign annotator pairs

Copy `annotators.example.json` to `data/annotators.json` and replace the example addresses with the annotators' DATS emails. Their order determines the pairs. Then run:

```bash
python assign_annotators.py --input data/sentence_sample_project_<PROJECT_ID>.csv --seed <ASSIGN_SEED> --backend_url <BACKEND_URL> --username <USERNAME>
```

The script verifies that the code exists and every annotator is a project member. Five annotators form ten pairs; with the default sample, each pair receives 40 sentences with the same 10 background, 20 proxy, and 10 fresh mix. Sentences are shuffled and numbered without revealing their draw.

The assignment CSV identifies the draws and is intended only for the person managing the study and the statistical analysis. The separate sentence annotation import contains two rows per sentence, one for each assigned annotator.

## 4. Import and preserve the record

In DATS, open **Project Settings → Import → sentence annotations** and upload `data/selected_sentence_annotations_project_<PROJECT_ID>.csv`. Each annotator can then find the assigned sentences under `SELECTED` in their own annotations.

!!! warning "Sentence annotation import compatibility"
    DATS versions up to v1.14.0 incorrectly run the span annotation import for a standalone sentence annotation import. Use a DATS version containing the sentence annotation import fix.

Preserve the export and manifest, sample and draw log, assignment and assignment log, annotation import, `proxy_terms.json`, and the tool's commit together. The SHA-256 hashes in the manifests and logs connect each output to its input and make the sampling chain auditable.
