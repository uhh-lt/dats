import html
import re
from collections.abc import Callable
from typing import Dict, List

import lxml.html.clean as clean
import magic
from bs4 import BeautifulSoup
from readability import Document


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
            remove_unknown_tags=False,
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


def replace_div_class_page_with_page(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    for div in soup.find_all("div"):
        if div.get("class") == ["page"]:
            div.name = "page"
            div.attrs = {}

    return str(soup)
