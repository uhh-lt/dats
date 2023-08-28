from pathlib import Path

import scrapy
from crawler.spiders.spider_base import SpiderBase


class FileWithURLsSpider(SpiderBase):
    name = "file_with_urls"

    # provide arguments using the -a option
    def __init__(self, url_file=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if url_file is None:
            self.log(
                "You have to provide an input directory with -a url_file=/path/to/file_with_urls"
            )
            exit()

        input_file = Path(url_file)
        if not input_file.is_file():
            self.log(f"{input_file} is not a file!")
            exit()

        self.start_urls = input_file.read_text().splitlines()

    def parse(self, response, **kwargs):
        # apply pipeline
        item = self.init_item(response=response)
        yield item
