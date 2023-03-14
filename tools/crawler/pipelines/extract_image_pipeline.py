from scrapy import Selector
from crawler.items import IncelItem
from urllib.parse import urlparse


class ExtractImagePipeline:
    def process_item(self, item: IncelItem, spider):
        html = item["html"]

        # select all image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        image_urls = image_urls if image_urls is not None else []

        # only download valid images (https:// or http:// or relative with / )
        image_urls = []
        for image_url in image_urls:
            parsed_image_url = urlparse(image_url)
            # normal url, everything is fine
            if parsed_image_url.scheme == "http" or parsed_image_url.scheme == "https":
                image_urls.append(image_url)
            # relative url, prepend base url
            elif parsed_image_url.scheme == "":
                parsed_base_url = urlparse(item["url"])
                image_urls.append(f"{parsed_base_url.scheme}://{parsed_base_url.netloc}{parsed_image_url.path}")

        item["image_urls"] = image_urls
        return item
