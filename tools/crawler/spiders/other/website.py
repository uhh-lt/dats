import scrapy

from crawler.spiders.spider_base import SpiderBase


class WebsiteSpider(SpiderBase):
    """
    This Spiders finds and follows all <a href=""> links that are in-domain.
    """

    name = "website"
    start_urls = ["https://www.uni-hamburg.de/"]
    domain = "uni-hamburg.de"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # find all links (a-tags) on the page
        links = response.css("a::attr(href)").getall()

        # filter out links that are not in-domain
        links = [link for link in links if self.domain in link]

        # crawl all links
        for link in links:
            yield scrapy.Request(response.urljoin(link), callback=self.parse)

        # apply pipeline
        item = self.init_item(response=response)
        yield item
