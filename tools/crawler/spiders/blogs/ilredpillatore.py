import scrapy
from crawler.spiders.spider_base import SpiderBase


class IlredpillatoreSpider(SpiderBase):
    name = "ilredpillatore"
    current_thread_page = 1
    current_pages = 0
    start_urls = [
        "https://www.ilredpillatore.org/2022/10",
        "https://www.ilredpillatore.org/2022/09",
        "https://www.ilredpillatore.org/2022/08",
        "https://www.ilredpillatore.org/2022/07",
        "https://www.ilredpillatore.org/2022/05",
        "https://www.ilredpillatore.org/2022/03",
        "https://www.ilredpillatore.org/2022/02",
        "https://www.ilredpillatore.org/2022/01",
        "https://www.ilredpillatore.org/2021/12",
        "https://www.ilredpillatore.org/2021/11",
        "https://www.ilredpillatore.org/2021/10",
        "https://www.ilredpillatore.org/2021/09",
        "https://www.ilredpillatore.org/2021/08",
        "https://www.ilredpillatore.org/2021/07",
        "https://www.ilredpillatore.org/2021/06",
        "https://www.ilredpillatore.org/2021/05",
        "https://www.ilredpillatore.org/2021/04",
        "https://www.ilredpillatore.org/2021/03",
        "https://www.ilredpillatore.org/2021/02",
        "https://www.ilredpillatore.org/2021/01",
        "https://www.ilredpillatore.org/2020/12",
        "https://www.ilredpillatore.org/2020/11",
        "https://www.ilredpillatore.org/2020/10",
        "https://www.ilredpillatore.org/2020/09",
        "https://www.ilredpillatore.org/2020/08",
        "https://www.ilredpillatore.org/2020/07",
        "https://www.ilredpillatore.org/2020/06",
        "https://www.ilredpillatore.org/2020/05",
        "https://www.ilredpillatore.org/2020/04",
        "https://www.ilredpillatore.org/2020/03",
        "https://www.ilredpillatore.org/2020/02",
        "https://www.ilredpillatore.org/2020/01",
        "https://www.ilredpillatore.org/2019/12",
        "https://www.ilredpillatore.org/2019/11",
        "https://www.ilredpillatore.org/2019/10",
        "https://www.ilredpillatore.org/2019/09",
        "https://www.ilredpillatore.org/2019/08",
        "https://www.ilredpillatore.org/2019/07",
        "https://www.ilredpillatore.org/2019/06",
        "https://www.ilredpillatore.org/2019/05",
        "https://www.ilredpillatore.org/2019/04",
        "https://www.ilredpillatore.org/2019/03",
        "https://www.ilredpillatore.org/2019/02",
        "https://www.ilredpillatore.org/2019/01",
        "https://www.ilredpillatore.org/2018/12",
        "https://www.ilredpillatore.org/2018/11",
        "https://www.ilredpillatore.org/2018/10",
        "https://www.ilredpillatore.org/2018/09",
        "https://www.ilredpillatore.org/2018/08",
        "https://www.ilredpillatore.org/2018/07",
        "https://www.ilredpillatore.org/2018/06",
        "https://www.ilredpillatore.org/2018/05",
        "https://www.ilredpillatore.org/2018/04",
        "https://www.ilredpillatore.org/2018/03",
        "https://www.ilredpillatore.org/2018/02",
        "https://www.ilredpillatore.org/2018/01",
        "https://www.ilredpillatore.org/2017/12",
        "https://www.ilredpillatore.org/2017/11",
        "https://www.ilredpillatore.org/2017/10",
        "https://www.ilredpillatore.org/2017/09",
        "https://www.ilredpillatore.org/2017/08",
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # skip the overview page and go to the other ones
        if response.url in self.start_urls:
            urls = response.css(
                "div.td-pb-span8.td-main-content > div > div > div.item-details > h3 > a::attr(href)"
            ).getall()
            for url in urls:
                yield scrapy.Request(url, callback=self.parse)
        # parse the page
        else:
            # write html
            self.write_raw_response(response=response)

            # apply pipeline
            item = self.init_item(response=response)
            yield item
