from crawler.spiders.news.news_search_results_spider_base import (
    NewsSearchResultsSpiderBase,
)
from dateutil import parser


class SpiegelSearchResultsSpider(NewsSearchResultsSpiderBase):
    name = "SpiegelSearchResults"

    def _build_current_search_results_url(self, results_page: int) -> str:
        search_terms_parameter = "%2B".join(self.search_terms)
        url = f"https://www.spiegel.de/suche/?suchbegriff={search_terms_parameter}"

        if results_page > 1:
            # Spiegel removes the page parameter if it is 1
            url += f"&seite={results_page}"

        return url

    def _get_num_result_pages(self, response) -> int:
        return int(response.xpath("//span[@data-pagination-el='total']/text()").get())

    def _get_article_urls(self, response) -> list[str]:
        urls = response.xpath(
            "//section[@data-search-results]/article//header/h2/a/@href"
        ).getall()
        return urls

    def _get_article_title(self, response) -> str:
        title_spans = response.xpath(
            "//header[@data-area='intro']//h2//span/text()"
        ).getall()
        if title_spans is None or len(title_spans) == 0:
            return "N/A"
        return "".join(title_spans).strip()

    def _get_article_author(self, response) -> str:
        return "N/A"

    def _get_published_date(self, response) -> str:
        published_date = response.xpath(
            "//header[@data-area='intro']//time/@datetime"
        ).get()
        if published_date is None:
            return "N/A"
        return parser.parse(published_date).strftime("%Y-%m-%d")

    def _is_search_results_page(self, response) -> bool:
        return response.url.startswith("https://www.spiegel.de/suche")
