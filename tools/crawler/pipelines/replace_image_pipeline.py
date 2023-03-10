from scrapy import Selector
from crawler.items import IncelItem


class ReplaceImagePipeline:
    def process_item(self, item: IncelItem, spider):
        html = item["html"]
        image_names = item["image_names"]  # either str or False if the download failed
        image_urls = item["image_urls"]  # download links of images

        # find all img tags in the source document
        images = Selector(text=html).css("img").getall()

        # remove images that we did not download and those were the download failed
        for image in images:
            # check if the image contains any downloaded image_url, if not delete the image
            if (
                len(
                    list(
                        filter(
                            lambda x: x[0] and image.find(x[1]) != -1,
                            zip(image_names, image_urls),
                        )
                    )
                )
                == 0
            ):
                html = html.replace(image, "")

        # replace image urls in html file
        for image_name, image_url in zip(image_names, image_urls):
            # this image was downloaded successfully, replace url
            if image_name:
                html = html.replace(image_url, image_name)

        item["html"] = html
        return item
