from urllib.parse import urlparse

from crawler.spiders.crawl_spider_base import CrawlSpiderBase
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import Rule


class WebsiteSpider(CrawlSpiderBase):
    """
    This Spiders finds and follows all links that are in-domain.
    """

    name = "website"
    allowed_domains = ["uni-hamburg.de"]
    start_urls = ["https://www.uni-hamburg.de/"]
    visited_links = set()
    filenams = set()

    rules = (
        Rule(
            LinkExtractor(),
            process_links="filter_links",
            callback="parse_item",
            follow=True,
        ),
    )

    def filter_links(self, links):
        filtered_links = []
        for link in links:
            url = urlparse(link.url)
            if url.path.endswith(".html"):
                filtered_links.append(link)
        return filtered_links

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
