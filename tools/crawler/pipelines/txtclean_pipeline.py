# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from crawler.items import IncelItem
import re


class TXTCleanPipeline:

    def process_item(self, item: IncelItem, spider):
        if 'text' in item and len(item["text"]) > 0:
            # clean redundant whitespaces
            item["text"] = re.sub(r"\s+", " ", item["text"]).strip()

        return item

