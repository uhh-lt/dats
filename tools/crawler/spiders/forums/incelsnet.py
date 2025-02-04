import scrapy

from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify


class IncelsnetSpider(SpiderBase):
    name = "incelsnet"
    discussions_url = "https://incels.net/forums/quality-central.6/page-"
    threads_url = "https://incels.net/threads/"

    # provide arguments using the -a option
    def __init__(self, page=2, pages=35, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [
            f"{self.discussions_url}{x}" for x in range(int(page), int(pages) + 1)
        ]

    def parse(self, response, **kwargs):
        # if on the discussions page
        if response.url.startswith(self.discussions_url):
            # get a list of all discussion links
            discussions = response.css(
                "div.structItem-cell.structItem-cell--main > div.structItem-title > a:last-child::attr(href)"
            ).getall()

            # visit every discussion
            for discussion in discussions:
                yield scrapy.Request(response.urljoin(discussion), callback=self.parse)

        # if in a forum thread
        if response.url.startswith(self.threads_url):
            thread_slug = response.url.split(self.threads_url)[1]

            # select the content of the first post
            title = response.css(
                "div.p-body > div > div.p-body-header > div.p-title > h1::text"
            ).getall()
            title = title[0] if title and len(title) > 0 else None
            authors = response.css(
                "article > div > div.message-cell.message-cell--user > section > h4 > a::text"
            ).getall()
            comments = response.css(
                "article > div > div.message-cell.message-cell--main > div > div > div > article > div.bbWrapper"
            ).getall()
            html = "<hr>".join(
                [
                    f"<b>{author}:</b><br/>{comment}"
                    for author, comment in zip(authors, comments)
                ]
            )
            if title:
                html = f"<h1>{title}</h1>{html}"

            # define custom filename
            filename = slugify(f"{self.prefix}-{thread_slug}")

            # write raw html, but use custom filename
            self.write_raw_response(response=response, filename=filename)

            # apply pipeline, but use the extracted html instead of raw_html and use custom filename
            item = self.init_item(response=response, html=html, filename=filename)
            if title:
                item["title"] = title
            yield item
