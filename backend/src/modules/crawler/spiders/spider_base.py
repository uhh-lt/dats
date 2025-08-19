import logging
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import scrapy

from modules.crawler.crawled_item import CrawledItem
from modules.crawler.crawler_utils import slugify


class SpiderBase(scrapy.Spider):
    def __init__(self, output_dir: str, *args, **kwargs):
        super(SpiderBase, self).__init__(*args, **kwargs)
        self.output_dir = output_dir
        self.log(f"Output Directory: {self.output_dir}", level=logging.INFO)

    def _generate_filename_from_respone(self, response) -> str:
        parsed_url = urlparse(response.url)
        filename = slugify(Path(parsed_url.path).stem)
        return filename

    def init_crawled_item(self, response) -> CrawledItem:
        item = CrawledItem()

        item["url"] = response.url
        item["access_date"] = datetime.now().strftime("%d.%m.%Y - %H:%M:%S")

        try:
            item["raw_html"] = response.body.decode(response.encoding)
        except UnicodeDecodeError:
            item["raw_html"] = response.body

        item["image_urls"] = []
        item["image_names"] = []
        item["images"] = []

        item["title"] = ""
        item["clean_html"] = ""

        item["filename"] = self._generate_filename_from_respone(response=response)
        item["output_dir"] = str(self.output_dir)
        return item

    def parse(self, response, **kwargs) -> Any:
        raise NotImplementedError("This method has to be implemented in a subclass!")
