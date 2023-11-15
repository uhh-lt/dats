from urllib.parse import urlparse

from scrapy import Selector

from crawler.items import GenericWebsiteItem


class ExtractImagePipeline:
    def process_item(self, item: GenericWebsiteItem, spider):
        html = item["html"]

        # select all image sources
        image_urls = Selector(text=html).css("img::attr(src)").getall()
        image_urls = image_urls if image_urls is not None else []

        # only download valid images (https:// or http:// or relative with / )
        filtered_image_urls = []
        for image_url in image_urls:
            parsed_image_url = urlparse(image_url)
            # normal url, everything is fine
            if parsed_image_url.scheme == "http" or parsed_image_url.scheme == "https":
                filtered_image_urls.append(image_url)
            # relative url starting with / -> prepend base url
            elif parsed_image_url.scheme == "" and parsed_image_url.netloc == "":
                parsed_base_url = urlparse(item["url"])
                filtered_image_urls.append(
                    f"{parsed_base_url.scheme}://{parsed_base_url.netloc}{parsed_image_url.path}"
                )
            # relative url starting with // -> prepend base scheme
            elif parsed_image_url.scheme == "":
                parsed_base_url = urlparse(item["url"])
                filtered_image_urls.append(
                    f"{parsed_base_url.scheme}://{parsed_image_url.netloc}{parsed_image_url.path}"
                )

        item["image_urls"] = image_urls
        return item
