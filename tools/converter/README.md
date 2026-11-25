# DATS Metadata Converter

Converts the metadata of a DATS project through the DATS API. The folder is self-contained: it needs nothing from the rest of the repository.

## Installation

```
pip install -r requirements.txt
```

## Year to date

`dats_metadata_year_to_date.py` copies a NUMBER metadata holding years (e.g. `year`) into a new DATE metadata (default: `<key>_date`), setting it to January 1st of the year (`1987` becomes `1987-01-01`).

- For every doctype that has the NUMBER metadata, it creates the DATE metadata with the same doctype and description.
- The NUMBER metadata stays untouched; delete it in DATS yourself once the DATE metadata is fine.
- Running it again reuses the DATE metadata and writes the values again.
- A DATE metadata always has a value, and DATS fills a new one with today's date. Documents without a valid year (empty, `0`, or outside 1 to 9999) keep that date; the script lists them at the end so they can be fixed by hand.

```
# show what would change
python dats_metadata_year_to_date.py --backend_url http://localhost:5500/ --project_id 1 --metadata_key year --dry_run

# convert
python dats_metadata_year_to_date.py --backend_url http://localhost:5500/ --project_id 1 --metadata_key year
```

## CLI Parameters

```
  --backend_url BACKEND_URL
                        URL of the dats backend api
  --username USERNAME   The username
  --password PASSWORD   The password
  --project_id PROJECT_ID
                        ID of the project
  --metadata_key METADATA_KEY
                        Key of the NUMBER metadata holding the years, e.g. year
  --new_metadata_key NEW_METADATA_KEY
                        Key of the DATE metadata to create (default: <metadata_key>_date)
  --batch_size BATCH_SIZE
                        Number of metadata values updated per request
  --dry_run             Only report what would be converted, change nothing
```
