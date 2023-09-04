import html
import re
from collections.abc import Callable
from typing import Dict, List

import lxml.html.clean as clean
import magic
from bs4 import BeautifulSoup
from loguru import logger
from readability import Document

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def clean_html_tags_and_attrs(
    tags_to_kill: List[str], tags_to_remove: List[str], attrs_to_keep: List[str]
) -> Callable[[str], str]:
    def x(html: str) -> str:
        # use cleaner to only include relevant attributes and to remove unwanted tags
        cleaner = clean.Cleaner(
            safe_attrs_only=True,
            safe_attrs=attrs_to_keep,
            kill_tags=tags_to_kill,
            remove_tags=tags_to_remove,
        )
        return str(cleaner.clean_html(html))

    return x


def string_replace(replace: Dict[str, str]) -> Callable[[str], str]:
    def x(html: str) -> str:
        rep = dict((re.escape(k), v) for k, v in replace.items())
        pattern = re.compile("|".join(rep.keys()))
        return pattern.sub(lambda m: rep[re.escape(m.group(0))], html)

    return x


def regex_replace(pattern: str, replacement: str) -> Callable[[str], str]:
    def x(html: str) -> str:
        return re.sub(pattern, replacement, html)

    return x


def string_strip(html_content: str) -> str:
    return html_content.strip()


def unescape_html(html_content: str) -> str:
    return html.unescape(html_content)


def apply_readability(html_content: str) -> str:
    doc = Document(html_content)
    return doc.summary()


def remove_unresolved_links(html_content: str) -> str:
    # an unresolved link is a link that does not start with http or https
    soup = BeautifulSoup(html_content, "html.parser")
    for link in soup.find_all("a"):
        href = link.get("href")
        if href and not href.startswith("http"):
            print("removing unresolved link", href)
            link.unwrap()

    return str(soup)


def ensure_html_mime_type(html_content: str) -> str:
    # ensure that mime type is text/html
    mime = magic.from_buffer(html_content)
    if "html" not in mime.lower():
        html_content = f"<html>{html_content}</html>"
    return html_content


def has_readability_watermark(html_content: str) -> bool:
    return 'class="readability-watermark"' in html_content


def add_readability_watermark(html_content: str) -> str:
    if "readability-watermark" not in html_content:
        html_content = html_content.replace(
            "<html>", '<html class="readability-watermark">'
        )
    return html_content


def build_html_cleaning_pipeline(
    pipeline: List[Callable[[str], str]]
) -> Callable[[str], str]:
    def x(html_content: str) -> str:
        for f in pipeline:
            html_content = f(html_content)
        return html_content

    return x


cleaning_pipeline = build_html_cleaning_pipeline(
    [
        remove_unresolved_links,  # todo: remove unresolved images / video / audio... but how?
        clean_html_tags_and_attrs(
            tags_to_kill=["head", "script", "iframe", "object"],
            tags_to_remove=["html", "body", "span", "div", "article"],
            attrs_to_keep=[
                "src",
                "alt",
                "href",
                "title",
                "width",
                "height",
                "target",
            ],
        ),
        string_replace(replace={"\n": "", "&lt;": "❮", "&gt;": "❯"}),
        regex_replace(pattern=r"\s+", replacement=" "),
        string_strip,
        unescape_html,
    ]
)

cleaning_with_readability_pipeline = build_html_cleaning_pipeline(
    [
        clean_html_tags_and_attrs(
            tags_to_kill=["head", "script", "iframe", "object"],
            tags_to_remove=["span", "div"],
            attrs_to_keep=[
                "src",
                "alt",
                "href",
                "title",
                "width",
                "height",
                "target",
            ],
        ),
        string_replace(replace={"\n": "", "&lt;": "❮", "&gt;": "❯"}),
        regex_replace(pattern=r"\s+", replacement=" "),
        string_strip,
        unescape_html,
        apply_readability,
        ensure_html_mime_type,
        add_readability_watermark,
    ]
)


def clean_content_in_html(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    content_in_html = pptd.html

    if not has_readability_watermark(content_in_html):
        # here, we apply the same cleaning pipeline as in the crawler
        logger.debug("Processing HTML with readability!")
        content_in_html = cleaning_with_readability_pipeline(content_in_html)

    logger.info("Cleaning HTML document!")
    content_in_html = cleaning_pipeline(content_in_html)

    pptd.html = content_in_html

    return cargo
