import re

import scrapy

from crawler.spiders.spider_base import SpiderBase
from crawler.spiders.utils import slugify


class IlforumdegliincelSpider(SpiderBase):
    name = "ilforumdegliincel"
    current_thread_page = 1
    num_parsed_threads = 0

    def __init__(self, thread_id=None, max_pages=10, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if thread_id is None:
            print("thread_id is not provided!")
            exit()

        self.current_thread = f"?t={thread_id}"
        self.start_urls = [f"https://ilforumdegliincel.forumfree.it/?t={thread_id}"]
        self.max_threads = int(max_pages)

    def parse(self, response, **kwargs):
        # set current thread
        match = re.search(r"(\?t=\w*)", response.url)
        if match:
            self.current_thread = match.group(1)

        # extract thread id
        match = re.search(r"(\?t=)(\w*)", self.current_thread)
        if match:
            thread_id = match.group(2)

        # find the number of pages of this thread
        pages_element = response.css(
            "div.navsub.top.Justify > div.left.Sub > ul > li.jump > a::text"
        ).get()
        thread_pages = (
            int(pages_element.split(" ")[0]) if pages_element is not None else 1
        )

        # select the relevant content
        title = response.css(
            "table.mback > tr > td.mback_center > div.mtitle > h1::text"
        ).getall()
        title = title[0] if title and len(title) > 0 else None
        authors = response.css("li > table > tr.top > td.left > div > a::text").getall()
        comments = response.css(
            "li > table > tr.center > td.right > table > tr:nth-child(2) > td"
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
        filename = slugify(
            f"{self.prefix}-{thread_id}-{self.current_thread_page}of{thread_pages}"
        )

        # write raw html, but use custom filename
        self.write_raw_response(response=response, filename=filename)

        # apply pipeline, but use the extracted html instead of raw_html and use custom filename
        item = self.init_item(response=response, html=html, filename=filename)
        if title:
            item["title"] = title
        yield item

        # go to the next page
        if self.current_thread_page < thread_pages:
            next_page = response.urljoin(
                self.current_thread + "&st=" + str(self.current_thread_page * 15)
            )
            self.current_thread_page += 1
            yield scrapy.Request(next_page, callback=self.parse)

        # go to the next thread
        else:
            self.num_parsed_threads += 1
            next_thread = response.css(
                "div.skin_tbl > div > div.title.top.Item.Justify > div.left.Sub > a:nth-child(1)::attr(href)"
            ).get()
            if next_thread is not None and self.num_parsed_threads < self.max_threads:
                self.current_thread_page = 1
                next_thread = response.urljoin(next_thread)
                yield scrapy.Request(next_thread, callback=self.parse)
