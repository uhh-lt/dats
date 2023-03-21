from scrapy import Selector
from urllib.parse import urlparse

from app.core.data.crawler.crawled_item import CrawledItem
from app.core.data.crawler.spiders.spider_base import SpiderBase


class ExtractImageUrlsFromHtmlPipeline:
    def process_item(self, item: CrawledItem, spider: SpiderBase):
        html = item["clean_html"]

        # select all image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        image_urls = image_urls if image_urls is not None else []

        # only download valid images (https:// or http:// or relative with / )
        valid_image_urls = []
        for image_url in image_urls:
            parsed_image_url = urlparse(image_url)
            # normal url, everything is fine
            if parsed_image_url.scheme == "http" or parsed_image_url.scheme == "https":
                valid_image_urls.append(image_url)
            # relative url starting with / -> prepend base url
            elif parsed_image_url.scheme == "" and parsed_image_url.netloc == "":
                parsed_base_url = urlparse(item["url"])
                valid_image_urls.append(
                    f"{parsed_base_url.scheme}://{parsed_base_url.netloc}{parsed_image_url.path}"
                )
            # relative url starting with // -> prepend base scheme
            elif parsed_image_url.scheme == "":
                parsed_base_url = urlparse(item["url"])
                valid_image_urls.append(
                    f"{parsed_base_url.scheme}://{parsed_image_url.netloc}{parsed_image_url.path}"
                )

        item["image_urls"] = valid_image_urls
        return item
