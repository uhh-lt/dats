# Metadata Converter

The metadata converter (`tools/converter`) changes project metadata through the DATS API. It is self-contained and does not import code from the rest of the repository.

## Convert years to dates

`dats_metadata_year_to_date.py` copies a NUMBER metadata key that contains years into a DATE metadata key. For example, the year `1987` becomes the date `1987-01-01`.

For every document type that has the source key, the script creates the target key with the same document type and description. The target key defaults to `<metadata_key>_date`; use `--new_metadata_key` to choose another key. The source metadata remains unchanged.

A new DATE metadata key cannot be empty, so DATS initially assigns the current date to every document of that type. Documents with an empty year, `0`, or a year outside 1–9999 keep this default date. The script lists their document IDs at the end so that they can be corrected manually.

Running the script again reuses an existing DATE target key and writes the converted values again. It stops if the source key is missing or is not NUMBER, or if the target key already exists with a type other than DATE.

## Usage

Run the converter on a host that can reach the DATS backend API. Install its dependencies from the converter folder:

```bash
cd tools/converter
pip install -r requirements.txt
```

Run a dry run first to report what would be converted without changing the project:

```bash
python dats_metadata_year_to_date.py \
  --backend_url https://dats.example.com \
  --project_id 27 \
  --metadata_key year \
  --dry_run
```

After reviewing the output, run the conversion without `--dry_run`:

```bash
python dats_metadata_year_to_date.py \
  --backend_url https://dats.example.com \
  --project_id 27 \
  --metadata_key year
```

Use `--username` and `--password` to select the DATS account. `--batch_size` controls how many metadata values are updated per request (default: 500).
