import mimetypes
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from modules.crawler.crawled_item import CrawledItem
from scrapy.http import Request
from scrapy.pipelines.files import FilesPipeline

from ..crawler_utils import slugify


class CustomVideosDownloadPipeline(FilesPipeline):
    @classmethod
    def from_settings(cls, settings):
        store_uri = settings["VIDEOS_STORE"]
        return cls(store_uri, settings=settings)

    def get_media_requests(self, item: CrawledItem, info):
        # tell the downloader what to download
        return [Request(u) for u in item["video_urls"]]

    # Override this method for custom video filenames
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#custom-file-naming
    def file_path(
        self, request, response=None, info=None, *, item: Optional[CrawledItem] = None
    ):
        if item is not None:
            # the name of the html page (without .html)
            filename = item["filename"]

            # find video name and video suffix
            video_path = Path(urlparse(request.url).path)  # the last part of the url
            video_name = video_path.stem  # the name (without the extension)
            video_suffix = video_path.suffix
            name = f"{slugify(filename + '-' + video_name)}{video_suffix}"

            # might need to change suffix
            if response is not None:
                video_suffix = mimetypes.guess_extension(
                    response.headers.get("Content-Type").decode()
                )
                if video_suffix and not video_path.name.endswith(video_suffix):
                    name = f"{slugify(filename + '-' + video_name)}{video_suffix}"

            return name
        return "video.mp4"

    # Override this method for custom completion actions
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#scrapy.pipelines.images.ImagesPipeline.item_completed
    def item_completed(self, results, item: CrawledItem, info):
        # results:
        # [(False, <twisted.python.failure.Failure scrapy.pipelines.files.FileException: cannot identify video file <_io.BytesIO object at 0x7f565e9ba520>>),
        #  (True, {'url': 'https://incels.is/attachments/screenshot_20230119_034514_brave-png.697346/',
        #          'path': '450326-screenshot_20230119_034514_brave-png.png',
        #          'checksum': '51510974623398ecc4d1729cca080d9e',
        #          'status': 'downloaded'})]

        # collect video names
        # the image name of failed downloads are False
        video_names = [result[1]["path"] if result[0] else False for result in results]

        # write video names
        item["video_names"] = video_names
        item["videos"] = results
        return item
