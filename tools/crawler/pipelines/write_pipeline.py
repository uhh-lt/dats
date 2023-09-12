import json
from pathlib import Path

from crawler.items import GenericWebsiteItem


class WritePipeline:
    def process_item(self, item: GenericWebsiteItem, spider):
        # define relevant directories
        output_dir = Path(item["output_dir"])
        html_output_dir = output_dir / "html"
        json_output_dir = output_dir / "json"
        txt_output_dir = output_dir / "txt"
        extracted_html_output_dir = output_dir / "extracted_html"
        raw_html_output_dir = output_dir / "raw_html"

        # write html
        if "html" in item:
            html_output_dir.mkdir(parents=True, exist_ok=True)
            with open(html_output_dir / f"{item['file_name']}.html", "w") as f:
                f.write(item["html"])

        # write html
        if "extracted_html" in item:
            extracted_html_output_dir.mkdir(parents=True, exist_ok=True)
            with open(
                extracted_html_output_dir / f"{item['file_name']}.html", "w"
            ) as f:
                f.write(item["extracted_html"])

        # write html
        if "raw_html" in item:
            raw_html_output_dir.mkdir(parents=True, exist_ok=True)
            with open(raw_html_output_dir / f"{item['file_name']}.html", "w") as f:
                f.write(item["raw_html"])

        # write json
        json_output_dir.mkdir(parents=True, exist_ok=True)
        with open(json_output_dir / f"{item['file_name']}.json", "w") as f:
            data = {key: value for key, value in item.items() if key != "output_dir" and key != "file_name"}
            json.dump(data, f)

        # write txt
        if "text" in item:
            txt_output_dir.mkdir(parents=True, exist_ok=True)
            with open(txt_output_dir / f"{item['file_name']}.txt", "w") as f:
                f.write(item["text"])

        return item
