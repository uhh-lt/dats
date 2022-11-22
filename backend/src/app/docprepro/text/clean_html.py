import html
import re
from typing import List

from loguru import logger
from tqdm import tqdm

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status


def clean_html_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Parsing html... "):
        if "html" in pptd.mime_type:
            logger.info(f"Cleaning html document!")

            # remove redundant white spaces
            content = re.sub(r"\s+", " ", pptd.html).strip()

            # resolve html special characters to their respective unicode character
            content = content.replace("&lt;", "❮")
            content = content.replace("&gt;", "❯")
            content = html.unescape(content)

            # remove <html> tags
            if content.startswith("<html>") and content.endswith("</html>"):
                content = content.replace("<html>", "")
                content = content.replace("</html>", "")

            pptd.html = content

            # Flo: update sdoc status
            update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.clean_html)

    return pptds
