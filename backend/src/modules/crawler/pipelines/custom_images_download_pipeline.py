import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from scrapy.pipelines.images import ImagesPipeline

from modules.crawler.crawled_item import CrawledItem
from modules.crawler.crawler_utils import slugify


class CustomImagesDownloadPipeline(ImagesPipeline):
    # Override this method for custom image filenames
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#custom-file-naming
    def file_path(
        self,
        request,
        response=None,
        info=None,
        *,
        item: CrawledItem | None = None,
    ) -> str:
        if item is not None:
            # the name of the html page (without .html)
            filename = item["filename"]

            # find image name and image suffix
            image_path = Path(urlparse(request.url).path)  # the last part of the url
            image_name = image_path.stem  # the name (without the extension)
            image_suffix = image_path.suffix
            name = f"{slugify(filename + '-' + image_name)}{image_suffix}"

            # might need to change suffix
            if response is not None:
                image_suffix = mimetypes.guess_extension(
                    response.headers.get("Content-Type").decode()
                )
                if image_suffix and not image_path.name.endswith(image_suffix):
                    name = f"{slugify(filename + '-' + image_name)}{image_suffix}"

            return name
        return "image.jpg"

    # Override this method for custom completion actions
    # https://docs.scrapy.org/en/latest/topics/media-pipeline.html#scrapy.pipelines.images.ImagesPipeline.item_completed
    def item_completed(self, results, item: CrawledItem, info) -> CrawledItem:
        # collect images names
        # the image name of failed downloads are False
        image_names = [result[1]["path"] if result[0] else False for result in results]

        # write item names
        item["image_names"] = image_names
        return item
