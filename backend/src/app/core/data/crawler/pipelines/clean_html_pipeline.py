# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


import html
import re

# useful for handling different item types with a single interface
import lxml.html.clean as clean
import magic
from readability import Document

from app.core.data.crawler.crawled_item import CrawledItem


class CleanHtmlPipeline:
    def process_item(self, item: CrawledItem, spider) -> CrawledItem:
        html_content = item["raw_html"]

        # use cleaner to only include relevant attributes and to remove unwanted tags
        safe_attrs = {"src", "alt", "href", "title", "width", "height"}
        kill_tags = ["object", "iframe"]
        cleaner = clean.Cleaner(
            safe_attrs_only=True, safe_attrs=safe_attrs, kill_tags=kill_tags
        )
        html_content = str(cleaner.clean_html(html_content))

        # manually remove tags
        html_content = html_content.replace("<div>", "")
        html_content = html_content.replace("</div>", "")
        html_content = html_content.replace("<span>", "")
        html_content = html_content.replace("</span>", "")
        html_content = html_content.replace("\n", "")

        # clean spaces
        html_content = re.sub(r"\s+", " ", html_content).strip()

        # resolve html special characters to their respective unicode character
        html_content = html_content.replace("&lt;", "❮")
        html_content = html_content.replace("&gt;", "❯")
        html_content = html.unescape(html_content)

        # apply readability https://github.com/buriy/python-readability
        doc = Document(html_content)
        html_content: str = doc.summary()

        # ensure that mime type is text/html
        mime = magic.from_buffer(html_content)
        if "html" not in mime:
            html_content = f"<html>{html_content}</html>"

        item["clean_html"] = html_content

        return item
