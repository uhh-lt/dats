import datetime
from typing import List

import scrapy
from crawler.items import GenericWebsiteItem
from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify


class LexisNexisSpider(SpiderBase):
    name = "lexisnexis"

    @classmethod
    def update_settings(cls, settings):
        # see https://docs.scrapy.org/en/latest/topics/settings.html#settings-per-spider
        super().update_settings(settings)
        settings.set(
            "DOWNLOAD_HANDLERS",
            {
                "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
                "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            },
            priority="spider",
        )
        settings.set("PLAYWRIGHT_BROWSER_TYPE", "chromium", priority="spider")
        settings.set(
            "PLAYWRIGHT_LAUNCH_OPTIONS",
            {
                "headless": True,
            },
            priority="spider",
        )
        settings.set(
            "TWISTED_REACTOR",
            "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
            priority="spider",
        )
        settings.set(
            "USER_AGENT",
            None,
            priority="spider",
        )

    # provide arguments using the -a option
    def __init__(
        self,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.start_urls = [
            "https://advance-1lexis-1com-1rubm3rfn0569.emedien3.sub.uni-hamburg.de/search/?pdmfid=1516831&crid=53e03713-13f8-414a-b4b0-356e59efcdf1&pdsearchtype=SearchBox&pdtypeofsearch=searchboxclick&pdstartin=&pdsearchterms=(Klimaklage*)+ODER+(Klimaprozess*+UND+Recht*+ODER+Gericht*)+ODER+((Grundrecht*+ODER+Menschenrecht*)+UND+Klima+UND+Klage+UND+NICHT+American+Breakfast)+ODER+(Klima+UND+Klage%3F+UND+Klimawandel)+ODER+(Verfassungsbeschwerde+UND+Klima)+ODER+((Bundesverfassungsgericht+near%2F30+Klimaschutz)+UND+Grad+UND+NICHT+Corona)&pdtimeline=Letzte+2+Jahre+%7C+p2y&pdpsf=&pdquerytemplateid=&pdsf=&ecomp=wbJgkgk&prid=00af5380-8df8-43ac-928f-fea1dc814763"
        ]

    def parse(self, response, **kwargs):
        print(self.cookies)
        print(response.body)
        # # if on the first search results page
        # if response.url in self.start_urls:
        #     # get the number of search results pages
        #     num_result_pages = self._get_num_result_pages(response)

        #     # find the urls of the articles of the first results page
        #     article_urls = self._get_article_urls(response)

        #     # visit every article of the fist results page
        #     for url in article_urls:
        #         yield scrapy.Request(
        #             url,
        #             callback=self.parse,
        #             cookies=self.cookies,
        #         )

        #     # visit every other search results page
        #     for page in range(2, num_result_pages + 1):
        #         if page > self.max_pages:
        #             break
        #         next_page_url = self._build_current_search_results_url(
        #             results_page=page
        #         )
        #         yield scrapy.Request(
        #             next_page_url,
        #             callback=self.parse,
        #             cookies=self.cookies,
        #             meta={"playwright": True} if self.use_playwright else None,
        #         )

        # # if on a search results page
        # if self._is_search_results_page(response):
        #     # find the urls of the articles of the this results page
        #     article_urls = self._get_article_urls(response)

        #     # visit every article of the this results page
        #     for url in article_urls:
        #         yield scrapy.Request(
        #             url,
        #             callback=self.parse,
        #             cookies=self.cookies,
        #             meta={"playwright": True} if self.use_playwright else None,
        #         )

        # # if on an article page
        # else:
        yield self.init_item(response)


# LNPAGEHISTORY=53e03713-13f8-414a-b4b0-356e59efcdf1%2C53e03713-13f8-414a-b4b0-356e59efcdf1%2C53e03713-13f8-414a-b4b0-356e59efcdf1; rl_user_id=%22%22; rl_anonymous_id=%2284302d7b-7043-4882-bb5b-3e3c4582d701%22; ajs_user_id=dd0a0fb6-5f0e-5b8e-a92e-614e734637db; ajs_anonymous_id=9bf0bd2e-3628-49c0-b4b5-c16b0f0f35ba; _ga=GA1.2.1615149479.1677504505; _ga_Z4KXEBY4VP=GS1.1.1694684866.1.0.1694684868.58.0.0; OptanonAlertBoxClosed=2023-10-10T09:55:47.786Z; OptanonConsent=isGpcEnabled=0&datestamp=Tue+Oct+10+2023+11%3A56%3A39+GMT%2B0200+(Central+European+Summer+Time)&version=6.32.0&isIABGlobal=false&consentId=105a4d1a-ea00-4c0d-b607-f7427c1aac53&interactionCount=1&landingPath=NotLandingPage&AwaitingReconsent=false&groups=1%3A1%2C2%3A1%2C3%3A1%2C4%3A1&hosts=mck%3A1%2CH154%3A1%2Csxb%3A1%2CH13934%3A1%2CH372%3A1%2Cxff%3A1%2CH67%3A1%2Clvz%3A1%2CH88%3A1%2Ccpi%3A1%2CH10185%3A1%2CH13935%3A1%2CH10315%3A1%2Czyg%3A1%2Cpax%3A1&geolocation=%3B&genVendors=; HHAUTHID=HHAUTHID6525424E732C5C4DB91D136E; HHCALLINGURL=https://advance-1lexis-1com-1rubm3rfn0342.emedien3.sub.uni-hamburg.de/Scripts/LexisAnswers/ln.advance.lexisanswers-default-de-DE.min.js?ver=23.10.6001.00007; HANID=HHSESSIONID6525424F732C5C4DB91D137E; LexisMachineId=6b6536b0-d231-4dc3-a3f7-88814a8fc86f; Perf=%7B%22name%22%3A%22document_uscontents-handler_logscroll%22%2C%22sit%22%3A%221696941800025.926%22%7D; X-LN-Session-TTL=2023-10-10T17%3A44%3A15Z%2C2023-10-10T14%3A44%3A15Z
# console.log(document.cookies)
# scrapy crawl lexisnexis -a output_dir=/home/tfischer/Development/dwts/data/lexisnexis -a use_playwright=True -a cookies="
