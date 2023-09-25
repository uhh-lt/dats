from app.core.data.crawler.crawled_item import CrawledItem
from app.core.data.crawler.spiders.spider_base import SpiderBase
from scrapy import Selector


class ExtractMediaUrlsFromHtmlPipeline:
    def process_item(self, item: CrawledItem, spider: SpiderBase):
        html = item["clean_html"]

        # image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        item["image_urls"] = image_urls if image_urls is not None else []

        # video sources
        video_urls = Selector(text=html).css("video > source::attr(src)").getall()
        video_urls.extend(Selector(text=html).css("video::attr(src)").getall())
        item["video_urls"] = video_urls if video_urls is not None else []

        # audio sources
        audio_urls = Selector(text=html).css("audio > source::attr(src)").getall()
        audio_urls.extend(Selector(text=html).css("audio::attr(src)").getall())
        item["audio_urls"] = audio_urls if audio_urls is not None else []

        return item
