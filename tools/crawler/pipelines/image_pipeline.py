import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from scrapy.pipelines.images import ImagesPipeline
from tools.crawler.spiders.spider_utils import slugify


class MyImagesPipeline(ImagesPipeline):
    def file_path(self, request, response=None, info=None, *, item):
        # returns the path where the image will be stored
        if item is None or "file_name" not in item:
            raise ValueError("item is None or does not have a file_name key")

        # the name of the html page (without .html)
        file_name = item["file_name"]

        # # find image name and image suffix
        image_path = Path(urlparse(request.url).path)  # the last part of the url
        image_name = image_path.stem  # the name (without the extension)
        image_suffix = image_path.suffix
        file_name = f"{slugify(file_name + '-' + image_name)}{image_suffix}"

        # might need to change suffix
        if response:
            image_suffix = mimetypes.guess_extension(
                response.headers.get("Content-Type").decode()
            )
            if image_suffix and not image_path.name.endswith(image_suffix):
                file_name = f"{slugify(file_name + '-' + image_name)}{image_suffix}"

        return file_name

    def item_completed(self, results, item, info):
        # collect images names
        # the image name of failed downloads are False
        image_names = [result[1]["path"] if result[0] else False for result in results]

        # write item names
        item["image_names"] = image_names
        return item
