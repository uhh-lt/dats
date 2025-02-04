import json
from pathlib import Path

from crawler.items import GenericWebsiteItem


class WritePipeline:
    def process_item(self, item: GenericWebsiteItem, spider):
        # define relevant directories
        output_dir = Path(item["output_dir"])
        json_output_dir = output_dir / "json"
        raw_html_output_dir = output_dir / "raw_html"

        # write html
        if "raw_html" in item:
            raw_html_output_dir.mkdir(parents=True, exist_ok=True)
            with open(raw_html_output_dir / f"{item['file_name']}.html", "w") as f:
                f.write(item["raw_html"])

        # write json
        json_output_dir.mkdir(parents=True, exist_ok=True)
        with open(json_output_dir / f"{item['file_name']}.json", "w") as f:
            data = {
                key: value
                for key, value in item.items()
                if key != "output_dir" and key != "file_name" and key != "raw_html"
            }
            json.dump(data, f)

        return item
