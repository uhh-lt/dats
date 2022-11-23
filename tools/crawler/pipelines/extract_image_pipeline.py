from scrapy import Selector
from crawler.items import IncelItem


class ExtractImagePipeline:

    def process_item(self, item: IncelItem, spider):
        html = item['html']

        # select all image sources
        image_urls = Selector(text=html).css('img::attr(src)').getall()
        image_urls = image_urls if image_urls is not None else []

        # only download valid images
        image_urls = [image_url for image_url in image_urls if image_url.startswith("https:") or image_url.startswith("http:")]

        item['image_urls'] = image_urls
        return item
