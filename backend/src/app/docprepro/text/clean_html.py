import html
import re
from typing import List

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status

tags_to_remove_completely = ["head", "script", "iframe", "object"]
tags_to_remove = ["html", "body"]


def clean_html_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Parsing html... "):
        if "html" in pptd.mime_type:
            logger.info(f"Cleaning html document!")

            # remove redundant white spaces
            content = re.sub(r"\s+", " ", pptd.html).strip()

            soup = BeautifulSoup(content, "html.parser")
            # remove specific tags and their children completely
            for tag in tags_to_remove_completely:
                for s in soup.select(tag):
                    s.extract()
            # remove specific tags but keep their children
            for tag in tags_to_remove:
                for s in soup.select(tag):
                    s.unwrap()
            content = str(soup)

            # resolve html special characters to their respective unicode character
            content = content.replace("&lt;", "❮")
            content = content.replace("&gt;", "❯")
            content = html.unescape(content)

            pptd.html = content

            # Flo: update sdoc status
            update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.clean_html)

    return pptds
