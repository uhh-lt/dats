import json
from pathlib import Path
from crawler.items import IncelItem


class WritePipeline:
    def process_item(self, item: IncelItem, spider):
        # define relevant directories
        output_dir = Path(item["output_dir"])
        html_output_dir = output_dir / "html"
        json_output_dir = output_dir / "json"
        txt_output_dir = output_dir / "txt"
        extracted_html_output_dir = output_dir / "extracted_html"
        raw_html_output_dir = output_dir / "raw_html"

        # exit if output dir does not exist
        if not output_dir.exists():
            print(f"Output dir {output_dir.absolute()} does not exist!")
            exit()

        # Create output dirs
        html_output_dir.mkdir(parents=True, exist_ok=True)
        json_output_dir.mkdir(parents=True, exist_ok=True)
        txt_output_dir.mkdir(parents=True, exist_ok=True)
        extracted_html_output_dir.mkdir(parents=True, exist_ok=True)
        raw_html_output_dir.mkdir(parents=True, exist_ok=True)

        # write html
        if "html" in item:
            with open(html_output_dir / f"{item['file_name']}.html", "w") as f:
                f.write(item["html"])

        # write html
        if "extracted_html" in item:
            with open(
                extracted_html_output_dir / f"{item['file_name']}.html", "w"
            ) as f:
                f.write(item["extracted_html"])

        # write html
        if "raw_html" in item:
            with open(raw_html_output_dir / f"{item['file_name']}.html", "w") as f:
                f.write(item["raw_html"])

        # write json
        with open(json_output_dir / f"{item['file_name']}.json", "w") as f:
            data = {key: value for key, value in item.items()}
            json.dump(data, f)

        # write txt
        if "text" in item:
            with open(txt_output_dir / f"{item['file_name']}.txt", "w") as f:
                f.write(item["text"])

        return item
