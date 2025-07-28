import mimetypes
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from modules.crawler.crawled_item import CrawledItem
from scrapy.http import Request
from scrapy.pipelines.files import FilesPipeline

from ..crawler_utils import slugify


class CustomAudiosDownloadPipeline(FilesPipeline):
    @classmethod
    def from_settings(cls, settings):
        store_uri = settings["AUDIOS_STORE"]
        return cls(store_uri, settings=settings)

    def get_media_requests(self, item: CrawledItem, info):
        # tell the downloader what to download
        return [Request(u) for u in item["audio_urls"]]

    # Override this method for custom audio filenames
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#custom-file-naming
    def file_path(
        self, request, response=None, info=None, *, item: Optional[CrawledItem] = None
    ):
        if item is not None:
            # the name of the html page (without .html)
            filename = item["filename"]

            # find audio name and audio suffix
            audio_path = Path(urlparse(request.url).path)  # the last part of the url
            audio_name = audio_path.stem  # the name (without the extension)
            audio_suffix = audio_path.suffix
            name = f"{slugify(filename + '-' + audio_name)}{audio_suffix}"

            # might need to change suffix
            if response is not None:
                audio_suffix = mimetypes.guess_extension(
                    response.headers.get("Content-Type").decode()
                )
                if audio_suffix and not audio_path.name.endswith(audio_suffix):
                    name = f"{slugify(filename + '-' + audio_name)}{audio_suffix}"

            return name
        return "audio.mp4"

    # Override this method for custom completion actions
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#scrapy.pipelines.images.ImagesPipeline.item_completed
    def item_completed(self, results, item: CrawledItem, info):
        # results:
        # [(False, <twisted.python.failure.Failure scrapy.pipelines.files.FileException: cannot identify audio file <_io.BytesIO object at 0x7f565e9ba520>>),
        #  (True, {'url': 'https://incels.is/attachments/screenshot_20230119_034514_brave-png.697346/',
        #          'path': '450326-screenshot_20230119_034514_brave-png.png',
        #          'checksum': '51510974623398ecc4d1729cca080d9e',
        #          'status': 'downloaded'})]

        # collect audio names
        # the image name of failed downloads are False
        audio_names = [result[1]["path"] if result[0] else False for result in results]

        # write audio names
        item["audio_names"] = audio_names
        return item
