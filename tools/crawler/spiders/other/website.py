from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import Rule

from crawler.spiders.crawl_spider_base import CrawlSpiderBase


class WebsiteSpider(CrawlSpiderBase):
    """
    This Spiders finds and follows all links that are in-domain.
    """

    name = "website"
    allowed_domains = ["uni-hamburg.de"]
    start_urls = ["https://www.uni-hamburg.de/"]
    visited_links = set()
    filenams = set()

    rules = (Rule(LinkExtractor(), callback="parse_item", follow=True),)

    def parse_item(self, response, **kwargs):
        # skip already visited links
        if response.url in self.visited_links:
            return
        self.visited_links.add(response.url)

        # init item
        item = self.init_item(response=response)

        # skip already saved files
        filename = item["file_name"]
        if filename in self.filenams:
            return
        self.filenams.add(filename)

        # apply pipeline
        yield item

    # save visited links in txt file
    def close(self, reason):
        with open("visited_links.txt", "w") as f:
            for link in self.visited_links:
                f.write(link + "\n")

        with open("filenames.txt", "w") as f:
            for filename in self.filenams:
                f.write(filename + "\n")
