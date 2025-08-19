# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


from urllib.parse import urljoin

from scrapy import Selector

from modules.crawler.crawled_item import CrawledItem


class ResolveRelativeURLsPipeline:
    def process_item(self, item: CrawledItem, spider) -> CrawledItem:
        html: str = item["clean_html"]

        # find all urls mentioned in the html document
        urls = Selector(text=html).css("*::attr(src)").getall()
        urls.extend(Selector(text=html).css("*::attr(href)").getall())
        urls = list(set(urls))  # remove duplicates

        # resolve urls
        resolved_urls = {url: urljoin(item["url"], url) for url in urls if len(url) > 0}

        # replace urls in html
        for key, value in resolved_urls.items():
            html = html.replace(key, value)

        item["clean_html"] = html

        return item
