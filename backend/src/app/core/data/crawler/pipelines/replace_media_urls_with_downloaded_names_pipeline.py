from typing import List

from scrapy import Selector

from app.core.data.crawler.crawled_item import CrawledItem


class ReplaceMediaUrlsWithDownloadedNamesPipeline:
    def remove_failed_media(
        self, selector: str, html: str, names: list, urls: List[str]
    ):
        # find all media elements in the html
        media_elements = Selector(text=html).css(selector).getall()

        # remove media elements where the download failed
        for media_element in media_elements:
            # check if the media_element contains any downloaded url, if not delete the media_element
            # TODO: this is bugged. We fix the urls in extract_media_urls_from_html_pipeline.py.
            # We will not find those fixed urls here in the cleaned html.
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

    def replace_successful_media_urls_with_downloaded_names(
        self, html: str, names: list, urls: List[str]
    ):
        for name, url in zip(names, urls):
            # this media was downloaded successfully, replace url
            if name:
                html = html.replace(url, name)

        return html

    def process_item(self, item: CrawledItem, spider):
        html = item["clean_html"]

        html = self.remove_failed_media(
            "img", html, item["image_names"], item["image_urls"]
        )
        html = self.remove_failed_media(
            "video", html, item["video_names"], item["video_urls"]
        )
        html = self.remove_failed_media(
            "audio", html, item["audio_names"], item["audio_urls"]
        )

        html = self.replace_successful_media_urls_with_downloaded_names(
            html, item["image_names"], item["image_urls"]
        )
        html = self.replace_successful_media_urls_with_downloaded_names(
            html, item["video_names"], item["video_urls"]
        )
        html = self.replace_successful_media_urls_with_downloaded_names(
            html, item["audio_names"], item["audio_urls"]
        )

        item["clean_html"] = html
        return item
