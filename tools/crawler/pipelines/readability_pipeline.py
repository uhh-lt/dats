# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from crawler.items import IncelItem
from readability.readability import Readability


class ReadabilityPipeline:
    def __init__(self):
        self.readability = Readability(port=6667)

    def process_item(self, item: IncelItem, spider):
        info = self.readability.parse(item["html"], item["url"])
        item["title"] = item["title"] if "title" in item else info["title"]
        item["html"] = info["content"]  # cleaned html
        item["text"] = info["textContent"]  # raw text, no html
        return item
