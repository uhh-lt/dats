import scrapy
from crawler.spiders.spider_base import SpiderBase


class IncelblogSpider(SpiderBase):
    name = "incelblog"
    current_thread_page = 1
    current_pages = 0
    start_urls = [
        "https://incel.blog/2022/",
        "https://incel.blog/2021/",
        "https://incel.blog/2020/",
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # skip the overview page and go to the other ones
        if response.url in self.start_urls:
            urls = list(
                set(
                    response.css(
                        "article > div > div.meta > div.title-wrap > h3 > a::attr(href)"
                    ).getall()
                )
            )
            for url in urls:
                yield scrapy.Request(url, callback=self.parse)
        # parse the page
        else:
            # write html
            self.write_raw_response(response=response)

            # apply pipeline
            item = self.init_item(response=response)
            yield item
