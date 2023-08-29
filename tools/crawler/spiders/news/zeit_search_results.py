import datetime
from typing import List, Optional

import scrapy
from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify
from dateutil import parser


class ZeitSearchResultsSpider(SpiderBase):
    name = "ZeitSearchResults"

    # provide arguments using the -a option
    def __init__(
        self,
        search_terms_csv: str,
        max_pages: int = 3,
        cookies: Optional[str] = None,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        if search_terms_csv == "":
            print("search_terms_csv not provided!")
            exit()
        self.search_terms = search_terms_csv.split(",")
        self.max_pages = int(max_pages)

        self.start_urls = [self._build_current_search_results_url(results_page=1)]

        # these cookies are required to access the search results
        # (primarily to consent to cookies etc)
        # self.cookies = {
        #     "creid": "1773825674969894416",
        #     "wt_fa": "lv~1691651988744|1707203988744#cv~1|1707203988744#fv~1691651988744|1707203988744#",
        #     "wt_fa_s": "start~1|1724752003682#",
        #     "wt_rla": "981949533494636%2C8%2C1693215788526",
        #     "_sp_enable_dfp_personalized_ads": "false",
        #     "_sp_v1_ss": "1:H4sIAAAAAAAAAItWqo5RKimOUbKKRmbkgRgGtbE6MUqpIGZeaU4OkF0CVlBdi1tCSQduIFRqVNmQVxYLANmXkA0mAgAA",
        #     "_sp_v1_p": "565",
        #     "_sp_v1_data": "618448",
        #     "_sp_su": "false",
        #     "wteid_981949533494636": "4169165292600645793",
        #     "wtsid_981949533494636": "1",
        #     "consentUUID": "e8bf2593-4233-43f2-8084-2e44c785fac7_22",
        #     "consentDate": "2023-08-10T09:32:01.855Z",
        #     "zonconsent": "2023-08-10T09:50:14.176Z",
        #     "gdpr": "1",
        #     "euconsent-v2": "CPwSZUAPwSZUAAGABCENDRCgAAAAAAAAAAYgAAAAAAAA.YAAAAAAAAAAA",
        # }
        self.cookies = {
            "creid": "1773825674969894416",
            "wt_fa": "lv~1691651988744|1707203988744#cv~1|1707203988744#fv~1691651988744|1707203988744#",
            "wt_fa_s": "start~1|1724757580964#",
            "wt_rla": "981949533494636%2C9%2C1693221297158",
            "_sp_enable_dfp_personalized_ads": "false",
            "_sp_v1_ss": "1:H4sIAAAAAAAAAItWqo5RKimOUbKKRmbkgRgGtbE6MUqpIGZeaU4OkF0CVlBdi1tCSQduIFRqVNmQVxYLANmXkA0mAgAA",
            "_sp_v1_p": "565",
            "_sp_v1_data": "618448",
            "_sp_su": "false",
            "wteid_981949533494636": "4169165292600645793",
            "wtsid_981949533494636": "1",
            "consentUUID": "e8bf2593-4233-43f2-8084-2e44c785fac7_22",
            "consentDate": "2023-08-10T09:32:01.855Z",
            "zonconsent": "2023-08-10T09:50:14.176Z",
            "gdpr": "1",
            "euconsent-v2": "CPwSZUAPwSZUAAGABCENDRCgAAAAAAAAAAYgAAAAAAAA.YAAAAAAAAAAA",
            "zeit_sso_201501": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMDcxOTEyIiwiZW1haWwiOiJmbG9yaWFuLnNjaG5laWRlci0xQHVuaS1oYW1idXJnLmRlIiwibmFtZSI6bnVsbCwic3RhdGUiOiJhY3RpdmUiLCJjb250YWN0X3ZpYV9lbWFpbCI6bnVsbCwicm9sZXMiOltdLCJoYXNfcGFzc3dvcmQiOiJ0cnVlIiwiZXhwIjoxNzI0NzU3NDYxfQ.hWAonnjkE-XaxM_sn87nqIlXoKi144Vz76bVM2FVIH4XLwEVCecWIVvSoAH5D56pFAfYRYThgD7-h17zF24CMIURwp0gIJP2yctq4FUyYyDnRI3pHj9M5hOtxiWbVEmF-L4f5xfLPHsCsHiRFkU-T6zNKuOYY0EUvXxlPhaW-9T-460lQ8oX7ODkKqtIqti1BDyH5Nm0UQIyWUOFMsmy667xz8FEz-T6B1UR5unMcWMdM3fIA_wE83Z7u0oheTFdCFBgcBRHT4pT31L_Hx7aCPzoUscW7SOpj-D88l5hdBaI-rRUFzM7sWcKi_zbEpt0b1ikShuEuzh84RvwG-X6Tg",
            "zeit_sso_session_201501": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMDcxOTEyIiwiZW1haWwiOiJmbG9yaWFuLnNjaG5laWRlci0xQHVuaS1oYW1idXJnLmRlIiwibmFtZSI6bnVsbCwic3RhdGUiOiJhY3RpdmUiLCJjb250YWN0X3ZpYV9lbWFpbCI6bnVsbCwicm9sZXMiOlsiMTA6ZGlnaXRhbF9hYm9ubmVudCJdLCJoYXNfcGFzc3dvcmQiOiJ0cnVlIiwiZXhwIjoxNjkzNDgwNjYxfQ.kkER4wVySOVmPmKNQoEOXkXPB305JKbiHx76XwEkvHhVLoqauosMxnZXZcv91RKYg7GWXoJM8Qn_WP-AcuiCit0tiJ7RCIRybfvIPYekiXix1WzDFIn6JugGXnA58SSnjP4KNjc7zlRFHHiCGZwXgoX31YsNUwK_7zrCd3PySarK2NQqiydzxYkXwFyFmsXhOmtK5sg9lvFsP9IT6SlPDgqKQnMf4vjsIKAOkie4xS6D7RTjoNzBYw9Gc4kq5VvU-0f_bLPWvs-enInPn65hc_KsUjZ6vz-9D8JCVIIDe5TwwaVXlKsm2rd3ePGCxOXXJG7ZMgF6xmW9OItznRaIeg",
            "zeit_sso_piano_201501": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IjEwMDcxOTEyQG5vc3VjaGVtYWlsLnplaXQuZGUiLCJzdWIiOiIxMDA3MTkxMiIsImlzcyI6Imh0dHBzOi8vbWVpbmUuemVpdC5kZSIsImF1ZCI6InplaXQuZGUiLCJleHAiOjE2OTM0ODA2NjF9.UNP-dch6FS9A8xva1eWknJRLwO-jIaNqKR-WH1F5ulB8uYMZ-39-Kzm2UVJzBhLKQ-WCSNms1QaRd5Ia5xpN-draZwnd2fWrsE4wyveWXpZSWHW2mBOmmmlEzj6Av-JwWhNgAdOPlr6CDdyu3w_v7x60LhvWwXI3cgvE4fRXceyW1Zeuq2xfWkV8EiR8q0F3R9v-968pDew8mgJ7m-cRjU3ozwdKukmoF0GOqWkNefj1_y2pqfp4-7oEV1crW2w1W_fNCxirm5w6nrZlEE6oblZ1wtwdefYGjcxcRj9CW3xHjrVM1zt3J31sDwwz1-UNgLGSqLxmhxK2BOJD4eF2Cg",
        }

    def _build_current_search_results_url(self, results_page: int) -> str:
        search_terms_parameter = "+".join(self.search_terms)
        url_no_page = f"https://www.zeit.de/suche/index?q={search_terms_parameter}"

        if results_page > 1:
            # Zeit removes the page parameter if it is 1
            return url_no_page + f"&p={results_page}"

        return url_no_page

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(url, cookies=self.cookies)

    def _get_article_urls(self, response) -> List[str]:
        urls = response.css(
            "div.page div.page__content main section.cp-area.cp-area--paginated article > a::attr(href)"
        ).getall()
        urls = [url for url in urls if not url.startswith("https://www.zeit.de/thema/")]
        return urls

    def _parse_article(self, response):
        # import pdb
        # pdb.set_trace()

        article_title: str = "".join(
            response.css("h1.article-heading > span ::text").getall()
        )
        # zeit.de
        author = response.css('span.metadata__source > a ::attr("title")').get()
        if author is None:
            # zeit.de plus
            author = response.css("div.article__intro > div.byline a span ::text").get()
        if author is None:
            # ze.tt
            author = response.css("span.metadata__author-list a span ::text").get()
        if author is None:
            author = "N/A"

        # zeit.de
        published_date = response.css(
            'span.metadata__date > time ::attr("datetime")'
        ).get()
        if published_date is None:
            # ze.tt
            published_date = response.css(
                'time.metadata__date ::attr("datetime")'
            ).get()
        if published_date is not None:
            published_date = parser.parse(published_date).strftime("%Y-%d-%m")
        else:
            published_date = "N/A"

        visited_date: str = datetime.datetime.now().strftime("%Y-%d-%m")
        filename = slugify(article_title)

        # write raw html, but use custom filename
        self.write_raw_response(response=response, filename=filename)

        item = self.init_item(
            response=response,
            filename=filename,
            title=article_title,
            author=author,
            published_date=published_date,
            visited_date=visited_date,
        )
        return item

    def parse(self, response, **kwargs):
        # import pdb
        # pdb.set_trace()
        # if on the first search results page
        if response.url in self.start_urls:
            # get the number of search results pages
            result_pages = int(
                response.css("ul.pager__pages > li:last-child ::text").get()
            )

            # find the urls of the articles of the first results page
            article_urls = self._get_article_urls(response)

            # visit every article of the fist results page
            for url in article_urls:
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    cookies=self.cookies,
                )

            # visit every other search results page
            for page in range(2, result_pages + 1):
                if page > self.max_pages:
                    break
                next_page_url = self._build_current_search_results_url(
                    results_page=page
                )
                yield scrapy.Request(
                    next_page_url,
                    callback=self.parse,
                    cookies=self.cookies,
                )

        # if on a search results page
        if response.url.startswith("https://www.zeit.de/suche/index"):
            # find the urls of the articles of the this results page
            article_urls = self._get_article_urls(response)

            # visit every article of the this results page
            for url in article_urls:
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    cookies=self.cookies,
                )

        # if on an article page
        else:
            yield self._parse_article(response)
