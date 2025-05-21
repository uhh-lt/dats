# Discourse Analysis Tool Suite Importer

This tool can be used to automatically import html, text, image and json files into the Discourse Analysis Tool Suite.

The importer works by calling the API of the Discourse Analysis Tool Suite to upload, tag and add metadata to provided documents.

## Requirements

- Python
- python-magic package

## Installation

```
pip install python-magic
```

## Usage

```
# import klimawirtschaft
python importer/dats_importer.py --input_dir /ltstorage/shares/projects/dwts/backend/src/dev_notebooks/data/KlimaWirtschaft/json --backend_url http://localhost:19002/ --project_id 86 --tag_name wirtschaft --tag_description wirtschaft --is_json --metadata_keys Newspaper Date Length Section Author Headline --metadata_types STRING DATE NUMBER STRING STRING STRING --doctype text --content_key Article --mime_type text/html --username SYSTEM@dwts.org

# import klimaallgemein metadata
python importer/dats_importer_metadata.py --input_dir /ltstorage/shares/projects/dwts/backend/src/dev_notebooks/data/KlimaAllgemein/json2 --backend_url http://localhost:19002/ --project_id 84 --metadata_keys paper paper_db headline date --metadata_types STRING STRING STRING DATE --doctype text --username SYSTEM@dwts.org

# import klimaallgemein
python importer/dats_importer.py --input_dir /ltstorage/shares/projects/dwts/backend/src/dev_notebooks/data/KlimaAllgemein/json2 --backend_url http://localhost:19002/ --project_id 84 --tag_name klima --tag_description klima --is_json --filter_duplicate_files_before_upload --metadata_keys paper paper_db headline date --metadata_types STRING STRING STRING DATE --doctype text --content_key html --mime_type text/html

# import cnn
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/cnn_crawl_fixed --backend_url http://localhost:10220/ --project_id 1 --tag_name cnn --tag_description cnn --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date visited_date origin --metadata_types STRING DATE DATE STRING --doctype text --content_key text

python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/cnn_crawl_fixed --backend_url http://localhost:19220/ --project_id 2 --tag_name cnn --tag_description cnn --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date visited_date origin --metadata_types STRING DATE DATE STRING --doctype text --content_key text

# import spiegel new
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/spiegel_crawl_fixed --backend_url http://localhost:19220/ --project_id 2 --tag_name spiegel --tag_description spiegel --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date origin --metadata_types STRING DATE STRING --doctype text --content_key html

# import zeit new
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/zeit_crawl_fixed --backend_url http://localhost:19220/ --project_name import --project_description test --tag_name zeit --tag_description zeit --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date origin --metadata_types STRING DATE STRING --doctype text --content_key raw_html

# import zeit search results
python importer/dats_importer.py --input_dir /home/7schneid/zeit_crawl/images --backend_url http://localhost:10101/ --project_id 143 --tag_name zeit
python importer/dats_importer.py --input_dir /home/7schneid/zeit_crawl/json --backend_url http://localhost:10101/ --project_id 143 --tag_name zeit --is_json

# import spiegel search results
python importer/dats_importer.py --input_dir /home/7schneid/spiegel_crawl/images --backend_url http://localhost:10101/ --project_id 143 --tag_name spiegel
python importer/dats_importer.py --input_dir /home/7schneid/spiegel_crawl/json --backend_url http://localhost:10101/ --project_id 143 --tag_name spiegel --is_json

# import global voices
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/globalvoices/images --backend_url http://localhost:13120/ --project_name global_voices --tag_name news
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/globalvoices/json --backend_url http://localhost:13120/ --project_name global_voices --tag_name news --is_json

# import wikinews
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/wikinews/images --backend_url http://localhost:13120/ --project_name wiki_news --tag_name news
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/wikinews/json --backend_url http://localhost:13120/ --project_name wiki_news --tag_name news --is_json

# import demonews
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/demonews/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name health
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/demonews/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name health --is_json

# import bbc
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/bbc/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc
python importer/dats_importer.py --input_dir /home/tfischer/Development/dats/data/bbc/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc --is_json

# import images
python dats_importer.py --input_dir /path/to/images --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1

# import json files
python dats_importer.py --input_dir /path/to/json --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1 --is_json

# convert zotero to json files
python zotero_converter.py Corpus/Corpus.bib
```

## CLI Parameters

```
  --input_dir INPUT_DIR
                        Path to directory containing json, text, html or image files to be imported
  --backend_url BACKEND_URL
                        URL of the dats backend api
  --project_name PROJECT_NAME
                        Name of the project to import to
  --project_description PROJECT_DESCRIPTION
                        Description of the project to create (only if new project is created)
  --tag_name TAG_NAME   Name of the tag that is automatically applied to all documents
  --tag_description TAG_DESCRIPTION
                        Description of the tag that is automatically applied to all documents
  --is_json             Set if the input_dir contains JSON files
```
