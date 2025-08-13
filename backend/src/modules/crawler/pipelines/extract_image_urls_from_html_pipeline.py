from modules.crawler.crawled_item import CrawledItem
from modules.crawler.spiders.spider_base import SpiderBase
from scrapy import Selector


class ExtractImageUrlsFromHtmlPipeline:
    def process_item(self, item: CrawledItem, spider: SpiderBase):
        html = item["clean_html"]

        # image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        item["image_urls"] = image_urls if image_urls is not None else []

        return item
