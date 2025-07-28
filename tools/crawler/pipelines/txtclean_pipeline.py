import re

from crawler.items import GenericWebsiteItem


class TXTCleanPipeline:
    def process_item(self, item: GenericWebsiteItem, spider):
        if "text" in item and len(item["text"]) > 0:
            # clean redundant whitespaces
            item["text"] = re.sub(r"\s+", " ", item["text"]).strip()

        return item
