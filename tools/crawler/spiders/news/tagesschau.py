import scrapy
from crawler.spiders.spider_base import SpiderBase


class TagesschauSpider(SpiderBase):
    name = "tagesschau"
    start_urls = [
        "https://www.tagesschau.de/inland/",
        "https://www.tagesschau.de/wissen/",
        "https://www.tagesschau.de/wirtschaft/",
        "https://www.tagesschau.de/ausland/",
        "https://www.tagesschau.de/investigativ/",
        "https://www.tagesschau.de/thema/ukraine/",
        "https://www.tagesschau.de/thema/china/",
        "https://www.tagesschau.de/inland/regional/",
        "https://www.tagesschau.de/thema/energiekrise/",
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # if on the overview page
        if response.url in self.start_urls:
            # get a list of all links
            urls = response.css("a.teaser__link::attr(href)").getall()
            urls.extend(response.css("a.teaser-xs__link::attr(href)").getall())

            # visit every discussion
            for url in urls:
                yield scrapy.Request(response.urljoin(url), callback=self.parse)

        # if in a news article
        else:
            # apply pipeline
            item = self.init_item(response=response)
            yield item
