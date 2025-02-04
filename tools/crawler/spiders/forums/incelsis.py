import scrapy

from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify


class IncelsisSpider(SpiderBase):
    name = "incelsis"

    # provide arguments using the -a option
    def __init__(self, page=5, max_pages=1000, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [
            f"https://incels.is/forums/inceldom-discussion.2/page-{x}"
            for x in range(int(page), int(max_pages) + 1)
        ]

    def parse(self, response, **kwargs):
        # if on the discussions page
        if response.url.startswith(
            "https://incels.is/forums/inceldom-discussion.2/page-"
        ):
            # get a list of all discussion links
            discussions = response.css(
                "div.structItem-cell.structItem-cell--main > div.structItem-title > a:last-child::attr(href)"
            ).getall()

            # visit every discussion
            for discussion in discussions:
                yield scrapy.Request(response.urljoin(discussion), callback=self.parse)

        # if in a forum thread
        if response.url.startswith("https://incels.is/threads/"):
            thread_slug = response.url.split("https://incels.is/threads/")[1]

            # select the relevant content
            title = response.css(
                "#top > div.p-body > div > div.p-body-header > div.p-title > h1::text"
            ).getall()
            title = title[0] if title and len(title) > 0 else None
            authors = response.css(
                "div.message-userDetails > h4.message-name > span.username > span::text"
            ).getall()
            comments = response.css(
                "div.message-userContent > article.message-body"
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
