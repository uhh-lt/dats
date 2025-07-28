import re
from datetime import datetime
from typing import Set

import requests
import scrapy
import srsly
from bs4 import BeautifulSoup
from tqdm.auto import tqdm

from crawler.items import GenericWebsiteItem
from crawler.spiders.spider_base import SpiderBase
from tools.crawler.spiders.spider_utils import slugify

EN_TOPIC_BASE_URL = "https://globalvoices.org/-/world/{TOPIC}/page/{PAGE_NUMBER}/"
NON_EN_TOPIC_BASE_URL = (
    "https://{LANG}.globalvoices.org/category/world/{TOPIC}/page/{PAGE_NUMBER}/"
)
ALL_TOPICS_URL = "https://{LANG}.globalvoices.org/page/{PAGE_NUMBER}/"


class GlobalVoicesSpider(SpiderBase):
    name = "global_voices_v2"

    # provide arguments using the -a option (they will be passed as strings!)
    def __init__(
        self,
        topics_csv: str = "",
        languages_csv: str = "en,de",
        max_pages: int = 100,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)

        self.available_topics = self._get_available_topics()
        self.available_languages = self._get_available_languages()
        topics = topics_csv.split(",") if topics_csv != "" else "all"
        languages = languages_csv.split(",")

        if topics != "all" and not all(
            topic in self.available_topics for topic in topics
        ):
            print(f"Invalid topic provided: {topics}")
            print(f"Available topics: {self.available_topics}")
            exit()

        if not all(lang in self.available_languages for lang in languages):
            print(f"Invalid language provided: {languages}")
            print(f"Available languages: {self.available_languages}")
            exit()

        self.topics = topics
        self.languages = languages

        self.max_pages = int(max_pages)
        self.start_urls = self._build_start_urls()
        self.all_article_urls: Set[str] = set()

    def _get_available_topics(self) -> list[str]:
        topics_url = "https://globalvoices.org/all-topics/"
        topics_response = requests.get(topics_url)
        topics_soup = BeautifulSoup(topics_response.text, "html.parser")
        topics = [a.text for a in topics_soup.select("li.taxonomy-list-item-topics a")]
        return topics

    def _get_available_languages(self) -> dict[str, str]:
        languages_url = "https://lingua.globalvoices.org/about/"
        languages_response = requests.get(languages_url)
        languages_soup = BeautifulSoup(languages_response.text, "html.parser")
        languages = ["English"] + [
            a.text
            for a in languages_soup.select(
                "div.main-column-container div.entry ul > li > a"
            )
        ]
        language_codes = ["en"] + [
            a.get("href", "UNK.").split(".")[0].replace("https://", "")  # type: ignore
            for a in languages_soup.select(
                "div.main-column-container div.entry ul > li > a"
            )
        ]
        return dict(zip(language_codes, languages))

    def _url_is_reachable(self, url: str) -> bool:
        try:
            response = requests.head(url, timeout=5)
            # Check if status code is in the 200-399 range, indicating reachability
            return response.status_code in range(200, 400)
        except requests.RequestException:
            return False

    def _build_start_urls(self) -> list[str]:
        urls = []
        for pid in range(1, self.max_pages + 1):
            for lang in self.languages:
                if self.topics == "all":
                    url = ALL_TOPICS_URL.format(LANG=lang, PAGE_NUMBER=pid)
                    urls.append(url)
                else:
                    for topic in self.topics:
                        if lang == "en":
                            url = EN_TOPIC_BASE_URL.format(TOPIC=topic, PAGE_NUMBER=pid)
                        else:
                            url = NON_EN_TOPIC_BASE_URL.format(
                                LANG=lang, TOPIC=topic, PAGE_NUMBER=pid
                            )
                        urls.append(url)

        # remove urls that are not reachable
        urls = [
            url
            for url in tqdm(urls, desc="Validating Page URLs")
            if self._url_is_reachable(url)
        ]
        self.logger.info(f"Found {len(urls)} page urls as start urls.")
        return urls

    def parse(self, response, **kwargs):
        # if on an article page parse the article
        if self._is_article_page(response):
            yield self._parse_article(response)
        else:
            # if on one of the pages or the start page
            # get a list of all article urls on the page
            article_urls = self._get_article_urls_from_page(response)
            self.all_article_urls.update(article_urls)
            # visit every article
            for url in article_urls:
                yield scrapy.Request(response.urljoin(url), callback=self.parse)

    def _is_article_page(self, response) -> bool:
        article_url_pattern = r"https://.*\.?globalvoices\.org/\d{4}/\d{2}/\d{2}/"
        return re.match(article_url_pattern, response.url) is not None

    def _get_article_urls_from_page(self, response) -> list[str]:
        return response.css("div.main-column article > div > a::attr(href)").getall()

    def _get_article_title(self, response) -> str:
        article_title_selector = response.css("h2.post-title > a")
        if article_title_selector.get() is None:
            self.logger.warning(f"No title found for article {response.url}")
            return "N/A"
        return article_title_selector.css("::text").get()

    def _get_article_author(self, response) -> str:
        authors_link_selector = response.css(
            "div.post-header-credit  div.contributor-name a"
        )
        if authors_link_selector.get() is None:
            self.logger.warning(f"No author found for article {response.url}")
            return "N/A"
        # there can be multiple authors. The first is the original author, the others are translators
        authors = authors_link_selector.css("::text").getall()
        authors = [
            f"{author} (original)" if i == 0 else f"{author} (translator)"
            for i, author in enumerate(authors)
        ]
        return ", ".join(authors)

    def _get_published_date(self, response) -> str:
        # pattern with 3 groups for year, month, and day
        article_url_pattern = r"https://.*\.?globalvoices\.org/(\d{4})/(\d{2})/(\d{2})/"

        match = re.search(article_url_pattern, response.url)
        if match is None:
            self.logger.warning(f"No published date found for article {response.url}")
            return "1970-01-01"
        else:
            try:
                # Extracts the year, month, and day
                year, month, day = match.groups()
                date_obj = datetime.strptime(f"{year}/{month}/{day}", "%Y/%m/%d")
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                self.logger.warning(
                    f"Cannot parse published date '{match}' for article {response.url}"
                )
                return "1970-01-01"

    def _get_topics(self, response) -> list[str]:
        topics_selector = response.css("div.post-terms-taxonomy-regions ul li a")
        topics = topics_selector.css("::text").getall()
        if topics is None:
            self.logger.warning(f"No topics found for article {response.url}")
            topics = []
        return topics

    def _get_regions(self, response) -> list[str]:
        regions_selector = response.css("div.post-terms-taxonomy-topics ul li a")
        regions = regions_selector.css("::text").getall()
        if regions is None:
            self.logger.warning(f"No regions found for article {response.url}")
            regions = []

        return regions

    def _parse_article(self, response) -> GenericWebsiteItem:
        article_title = self._get_article_title(response)
        author = self._get_article_author(response)
        published_date = self._get_published_date(response)
        topics = self._get_topics(response)
        regions = self._get_regions(response)
        visited_date: str = datetime.now().isoformat()
        filename = slugify(article_title)

        # write raw html, but use custom filename
        self.write_raw_response(response=response, filename=filename)

        item = self.init_item(
            response=response,
            filename=filename,
            title=article_title,
            author=author,
            topics=topics,
            regions=regions,
            published_date=published_date,
            visited_date=visited_date,
        )
        return item

    def __del__(self):
        try:
            fn = self.output_dir / "all_article_urls.json"
            print(f"Saving {len(self.all_article_urls)} articles to {fn}.")
            srsly.write_json(fn, list(self.all_article_urls))
        except Exception as e:
            print(f"Failed to save article urls: {e}")
            pass
