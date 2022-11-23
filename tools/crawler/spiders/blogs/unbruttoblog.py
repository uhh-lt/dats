import scrapy

from crawler.spiders.spider_base import SpiderBase


class UnbruttoblogSpider(SpiderBase):
    name = "unbruttoblog"
    current_thread_page = 1
    current_pages = 0
    start_urls = [
        'https://unbruttoblog.blogspot.com/2015/',
        'https://unbruttoblog.blogspot.com/2014/',
        'https://unbruttoblog.blogspot.com/2009/',
        'https://unbruttoblog.blogspot.com/2008/',
        'https://unbruttoblog.blogspot.com/2007/'
    ]
    
    # provide arguments useing the -a option
    # e.g. scrapy crawl brutti -a category=electronics
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # skip the overview page and go to the other ones
        if response.url in self.start_urls:
            urls = response.css('div.blog-posts.hfeed > div > div > div > div > h3 > a::attr(href)').getall()
            for url in urls:
                yield scrapy.Request(url, callback=self.parse)

        # parse the page
        else:
            # write html
            self.write_raw_response(response=response)

            # apply pipeline
            item = self.init_incel_item(response=response)
            yield item
