from urllib.parse import urlparse

import scrapy

from crawler.spiders.spider_base import SpiderBase


class WebsiteSpider(SpiderBase):
    """
    This Spiders finds and follows all <a href=""> links that are in-domain.
    """

    name = "website"
    start_urls = ["https://www.uni-hamburg.de/"]
    domain = "uni-hamburg.de"
    visited_links = set()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # find all links (a-tags) on the page
        links = response.css("a::attr(href)").getall()

        # filter out links that are not in-domain
        valid_links = set()
        for link in links:
            # join with response url
            link = response.urljoin(link)

            # remove query parameters
            link = urlparse(link)._replace(query="").geturl()

            # filter out links that are not in-domain
            if self.domain in link:
                valid_links.add(link)

        # filter out links that have already been visited
        links_to_visit = valid_links - self.visited_links
        self.visited_links.update(links_to_visit)

        # follow links
        for link in links_to_visit:
            yield scrapy.Request(link, callback=self.parse)

        # apply pipeline
        item = self.init_item(response=response)
        yield item

    # save visited links in txt file
    def close(self, reason):
        with open("visited_links.txt", "w") as f:
            for link in self.visited_links:
                f.write(link + "\n")
