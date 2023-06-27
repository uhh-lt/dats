from typing import List

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.html_cleaning_utils import (
    add_readability_watermark,
    apply_readability,
    build_html_cleaning_pipeline,
    clean_html_tags_and_attrs,
    ensure_html_mime_type,
    has_readability_watermark,
    regex_replace,
    remove_unresolved_links,
    string_replace,
    string_strip,
    unescape_html,
)
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status
from loguru import logger
from tqdm import tqdm

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


def clean_html_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Parsing html... "):
        if "html" in pptd.mime_type:
            if not has_readability_watermark(pptd.html):
                # here, we apply the same cleaning pipeline as in the crawler
                logger.info("Cleaning html document with readability!")
                pptd.html = cleaning_with_readability_pipeline(pptd.html)

            logger.info("Cleaning html document!")
            pptd.html = cleaning_pipeline(pptd.html)

        update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.clean_html)

    return pptds
