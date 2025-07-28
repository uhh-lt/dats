import scrapy
from crawler.spiders.spider_base import SpiderBase


class GlobalVoicesSpider(SpiderBase):
    name = "globalvoices"
    start_urls = [
        f"https://globalvoices.org/-/world/western-europe,eastern-central-europe/page/{i}/"
        for i in range(50)
    ]

    start_urls += [
        f"https://de.globalvoices.org/category/world/western-europe,eastern-central-europe/page/{i}/"
        for i in range(50)
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # if on the overview page
        if response.url in self.start_urls:
            # get a list of all links
            urls = response.css(".post-title a::attr(href)").getall()

            # visit every discussion
            for url in urls:
                yield scrapy.Request(response.urljoin(url), callback=self.parse)

        # if in a news article
        else:
            # apply pipeline
            item = self.init_item(response=response)
            yield item
