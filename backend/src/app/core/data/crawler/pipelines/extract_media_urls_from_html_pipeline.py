from typing import List
from urllib.parse import urljoin

from app.core.data.crawler.crawled_item import CrawledItem
from app.core.data.crawler.spiders.spider_base import SpiderBase
from scrapy import Selector


class ExtractMediaUrlsFromHtmlPipeline:
    def valid_urls(self, item: CrawledItem, urls: List[str]):
        # merge with base url to resolve possible relative urls
        return [urljoin(item["url"], url) for url in urls]

    def process_item(self, item: CrawledItem, spider: SpiderBase):
        html = item["clean_html"]

        # image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        image_urls = image_urls if image_urls is not None else []
        item["image_urls"] = self.valid_urls(item, image_urls)

        # video sources
        video_urls = Selector(text=html).css("video > source::attr(src)").getall()
        video_urls.extend(Selector(text=html).css("video::attr(src)").getall())
        video_urls = video_urls if video_urls is not None else []
        item["video_urls"] = self.valid_urls(item, video_urls)

        # audio sources
        audio_urls = Selector(text=html).css("audio > source::attr(src)").getall()
        audio_urls.extend(Selector(text=html).css("audio::attr(src)").getall())
        audio_urls = audio_urls if audio_urls is not None else []
        item["audio_urls"] = self.valid_urls(item, audio_urls)

        return item
