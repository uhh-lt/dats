import json
import sys
from pathlib import Path

# See: https://bibtexparser.readthedocs.io/en/main/install.html
# pip install --no-cache-dir --force-reinstall git+https://github.com/sciunto-org/python-bibtexparser@main
import bibtexparser
import bibtexparser.middlewares as m

layers = [m.LatexDecodingMiddleware(), m.SeparateCoAuthors()]

if len(sys.argv) < 2:
    print("Add the BibTeX File to the call: zotero_converter.py folder/bibtex.bib")
    exit()
filename = sys.argv[1]

library = bibtexparser.parse_file(filename, append_middleware=layers)


def clean_filename(filenamestr):
    filename = filenamestr.replace("\:", "")
    filename = filename.split(":")[-2]
    source = filename.split("/")[-1].replace("\\", "")
    filename = source.rsplit(".", 1)[0]
    return filename, source


input_folder = Path(filename).parent
json_folder = input_folder / "json"
json_folder.mkdir(exist_ok=True)

for entry in library.entries:
    article = {}
    fields = entry.fields_dict
    file = None
    for field in fields.keys():
        match field:
            case "file":
                file, source = clean_filename(fields[field].value)
                article["filename"] = source
            case _:
                article[field] = fields[field].value

    if file:
        json_path = json_folder / f"{file}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(article, indent=4, ensure_ascii=False))
