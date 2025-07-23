import logging
from typing import List, Set, Union

from modules.crawler.spiders.spider_base import SpiderBase


class ListOfURLSSpider(SpiderBase):
    name = "list_of_urls"

    def __init__(
        self, list_of_urls: Union[List[str], Set[str]], output_dir: str, *args, **kwargs
    ):
        super().__init__(output_dir, *args, **kwargs)
        if len(list_of_urls) == 0:
            self.log("At least one valid URL has to be provided!", level=logging.ERROR)
            exit()

        self.start_urls = list(set(list_of_urls))
        self.log(f"Number of Start URLs: {len(self.start_urls)}", level=logging.INFO)

    def parse(self, response, **kwargs):
        # TODO: track stats like suggested here:
        # https://stackoverflow.com/questions/22951418/how-to-collect-stats-from-within-scrapy-spider-callback
        # start pipeline
        item = self.init_crawled_item(response=response)
        yield item
