import logging
from app.core.data.crawler.crawled_item import CrawledItem
from app.core.data.crawler.spiders.spider_base import SpiderBase

from pathlib import Path


class WriteCrawledItemToDiskPipeline:
    def process_item(self, item: CrawledItem, spider: SpiderBase):
        # write the clean html to disk
        output_dir: str = item["output_dir"]
        filename: str = item["filename"]
        clean_html: str = item["clean_html"]

        file = (Path(output_dir) / filename).with_suffix(".html")
        if not file.parent.exists():
            spider.log(
                f"Output dir {file.parent} does not exist and gets created now as fallback!!",
                level=logging.ERROR,
            )
            file.parent.mkdir(parents=True)

        file.write_text(clean_html)

        spider.log(f"Writing clean HTML to: {file}", level=logging.INFO)

        return item
