# D-WISE Tool Suite Importer

This tool can be used to automatically import html, text, image and json files into the D-WISE Tool Suite.

The importer works by calling the API of the D-WISE Tool Suite to upload, tag and add metadata to provided documents.

## Requirements

- Python
- python-magic package

## Installation

```
pip install python-magic
```

## Usage

```
# import demonews
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/demonews/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name health
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/demonews/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name health --is_json

# import bbc
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/bbc/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/bbc/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc --is_json

# import images
python dwts_importer.py --input_dir /path/to/images --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1

# import json files
python dwts_importer.py --input_dir /path/to/json --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1 --is_json
```

## CLI Parameters

```
  --input_dir INPUT_DIR
                        Path to directory containing json, text, html or image files to be imported
  --backend_url BACKEND_URL
                        URL of the dwts backend api
  --project_name PROJECT_NAME
                        Name of the project to import to
  --project_description PROJECT_DESCRIPTION
                        Description of the project to create (only if new project is created)
  --tag_name TAG_NAME   Name of the tag that is automatically applied to all documents
  --tag_description TAG_DESCRIPTION
                        Description of the tag that is automatically applied to all documents
  --is_json             Set if the input_dir contains JSON files
```
