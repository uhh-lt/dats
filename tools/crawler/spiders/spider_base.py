from pathlib import Path
from urllib.parse import urlparse

import scrapy
from crawler.items import GenericWebsiteItem
from crawler.spiders.utils import slugify, validate_output_dir


class SpiderBase(scrapy.Spider):
    # provide arguments using the -a option
    def __init__(self, output_dir=None, prefix="", *args, **kwargs):
        super(SpiderBase, self).__init__(*args, **kwargs)
        self.prefix = prefix
        self.output_dir = validate_output_dir(output_dir)

    def generate_filename(self, response) -> str:
        parsed_url = urlparse(response.url)
        article_slug = Path(parsed_url.path).stem
        filename = slugify(f"{self.prefix}-{article_slug}")
        return filename

    def write_raw_response(self, response, filename=None):
        if not filename:
            filename = self.generate_filename(response=response)

        filename_with_extension = f"{filename}.html"
        try:
            with open(
                self.output_dir / filename_with_extension, "w", encoding="UTF-8"
            ) as f:
                f.write(response.body.decode(response.encoding))
        except UnicodeDecodeError:
            with open(self.output_dir / filename_with_extension, "wb") as f2:
                f2.write(response.body)
        self.log(f"Saved raw html {filename_with_extension}")

    def init_item(
        self, response, html=None, filename=None, **kwargs
    ) -> GenericWebsiteItem:
        item = GenericWebsiteItem()
        item["url"] = response.url
        item["file_name"] = (
            filename if filename else self.generate_filename(response=response)
        )

        try:
            item["raw_html"] = response.body.decode(response.encoding)
        except UnicodeDecodeError:
            item["raw_html"] = response.body

        item["extracted_html"] = html if html else ""
        item["html"] = html if html else item["raw_html"]
        item["output_dir"] = str(self.output_dir)

        for key, value in kwargs.items():
            if key in item:
                item[key] = value

        return item

    def parse(self, response, **kwargs):
        pass
