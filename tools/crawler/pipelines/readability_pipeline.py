from crawler.items import GenericWebsiteItem
from readability.readability import Readability  # type: ignore


class ReadabilityPipeline:
    def __init__(self):
        self.readability = Readability(port=6667)

    def process_item(self, item: GenericWebsiteItem, spider):
        info = self.readability.parse(item["raw_html"], item["url"])
        item["title"] = item["title"] if "title" in item else info["title"]
        item["html"] = info["content"]  # cleaned html
        item["text"] = info["textContent"]  # raw text, no html
        return item
