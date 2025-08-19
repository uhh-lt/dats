import base64
import os
from mimetypes import guess_type

from scrapy import Selector

from modules.crawler.crawled_item import CrawledItem


class ReplaceImageUrlsWithBase64Pipeline:
    def get_file_path(self, store_path, filename):
        # Try to find the file in the store path
        path = os.path.join(store_path, filename)
        if os.path.exists(path):
            return path
        # Try subfolders (Scrapy may store files in subfolders)
        for root, _, files in os.walk(store_path):
            if filename in files:
                return os.path.join(root, filename)
        return None

    def encode_image_to_base64(self, file_path):
        mime, _ = guess_type(file_path)
        if not mime:
            # fallback
            mime = "image/png"
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime};base64,{encoded}"

    def remove_failed_images(
        self, selector: str, html: str, names: list, urls: list[str]
    ):
        media_elements = Selector(text=html).css(selector).getall()
        for media_element in media_elements:
            if (
                len(
                    list(
                        filter(
                            lambda x: x[0] and media_element.find(x[1]) != -1,
                            zip(names, urls),
                        )
                    )
                )
                == 0
            ):
                html = html.replace(media_element, "")
        return html

    def replace_image_urls_with_base64(
        self, html: str, names: list, urls: list[str], media_type: str, spider
    ):
        store_path = spider.settings.get("IMAGES_STORE")
        for name, url in zip(names, urls):
            if name:
                file_path = self.get_file_path(store_path, name)
                if file_path:
                    data_uri = self.encode_image_to_base64(file_path)
                    html = html.replace(url, data_uri)
        return html

    def process_item(self, item: CrawledItem, spider):
        html = item["clean_html"]

        html = self.remove_failed_images(
            "img", html, item["image_names"], item["image_urls"]
        )

        html = self.replace_image_urls_with_base64(
            html, item["image_names"], item["image_urls"], "image", spider
        )

        item["clean_html"] = html
        return item
