import scrapy

from crawler.spiders.spider_base import SpiderBase


class BBCSpider(SpiderBase):
    name = "bbc"
    start_urls = [
        "https://www.bbc.com/news/health",
        "https://www.bbc.com/news/coronavirus",
        "https://www.bbc.com/news/science-environment-56837908",
        "https://www.bbc.com/news/world",
        "https://www.bbc.com/news/business",
        "https://www.bbc.com/news/technology",
        "https://www.bbc.com/news/science_and_environment",
        "https://www.bbc.com/news/entertainment_and_arts",
        "https://www.bbc.com/news/stories",
        "https://www.bbc.com/news/world/europe",
        "https://www.bbc.com/news/world/africa",
        "https://www.bbc.com/news/world/asia",
        "https://www.bbc.com/news/world/australia",
        "https://www.bbc.com/news/world/latin_america",
        "https://www.bbc.com/news/world/middle_east",
        "https://www.bbc.com/news/world/us_and_canada",
        "https://www.bbc.com/news/business-11428889",
        "https://www.bbc.com/news/business-38507481",
        "https://www.bbc.com/news/business-15521824",
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # if on the overview page
        if response.url in self.start_urls:
            # get a list of all links
            urls = [
                response.urljoin(x)
                for x in response.css(".qa-heading-link::attr(href)").getall()
            ]
            urls += [
                response.urljoin(x)
                for x in response.css(".gs-c-promo-heading::attr(href)").getall()
            ]
            urls = list(set(urls))

            # visit every discussion
            for url in urls:
                yield scrapy.Request(response.urljoin(url), callback=self.parse)

        # if in a news article
        else:
            # apply pipeline
            item = self.init_incel_item(response=response)
            yield item
