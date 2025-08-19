# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


from modules.crawler.crawled_item import CrawledItem
from modules.doc_processing.html.html_cleaning_utils import (
    cleaning_with_readability_pipeline,
)


class CleanHtmlPipeline:
    def __init__(self) -> None:
        self.cleaning_pipeline = cleaning_with_readability_pipeline

    def process_item(self, item: CrawledItem, spider) -> CrawledItem:
        item["clean_html"] = self.cleaning_pipeline(item["raw_html"])
        return item
