import scrapy

from crawler.spiders.spider_base import SpiderBase


class TotalitarismoSpider(SpiderBase):
    name = "totalitarismo"
    
    # provide arguments useng the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [f'https://www.totalitarismo.blog/category/questione-maschile/page/{x}/' for x in range(1, 11)]

    def parse(self, response, **kwargs):
        # skip the overview page and go to the other ones
        if response.url in self.start_urls:
            urls = response.css('header > h2 > a::attr(href)').getall()
            for url in urls:
                yield scrapy.Request(url, callback=self.parse)

        # parse the page
        else:
            # write html
            self.write_raw_response(response=response)

            # apply pipeline
            item = self.init_incel_item(response=response)
            yield item
