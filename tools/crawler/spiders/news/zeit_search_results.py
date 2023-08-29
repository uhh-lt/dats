from typing import List

from crawler.spiders.news.news_search_results_spider_base import (
    NewsSearchResultsSpiderBase,
)
from dateutil import parser


class ZeitSearchResultsSpider(NewsSearchResultsSpiderBase):
    name = "ZeitSearchResults"

    def _build_current_search_results_url(self, results_page: int) -> str:
        search_terms_parameter = "+".join(self.search_terms)
        url_no_page = f"https://www.zeit.de/suche/index?q={search_terms_parameter}"

        if results_page > 1:
            # Zeit removes the page parameter if it is 1
            return url_no_page + f"&p={results_page}"

        return url_no_page

    def _get_num_result_pages(self, response) -> int:
        return int(response.css("ul.pager__pages > li:last-child ::text").get())

    def _get_article_urls(self, response) -> List[str]:
        urls = response.css(
            (
                "div.page div.page__content main section.cp-area.cp-area--paginated "
                "article > a::attr(href)"
            )
        ).getall()
        urls = [url for url in urls if not url.startswith("https://www.zeit.de/thema/")]
        return urls

    def _get_article_title(self, response) -> str:
        title_spans = response.css("h1.article-heading > span ::text").getall()
        if title_spans is None or len(title_spans) == 0:
            return "N/A"
        return "".join(title_spans).strip()

    def _get_article_author(self, response) -> str:
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
        return author

    def _get_published_date(self, response) -> str:
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
        return published_date

    def _is_search_results_page(self, response) -> bool:
        return response.url.startswith("https://www.zeit.de/suche/index")
