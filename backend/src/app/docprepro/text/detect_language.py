from typing import List

from langdetect import detect_langs
from loguru import logger
from tqdm import tqdm

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status


def detect_language_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Detecting language... "):
        try:
            pptd.metadata["language"] = detect_langs(pptd.text)[
                0
            ].lang  # TODO Flo: what to do with mixed lang docs?
        except Exception as e:
            logger.warning(f"Cannot detect language of SDoc {pptd.sdoc_id}")
            pptd.metadata["language"] = "en"

        # update sdoc status
        update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.detect_language)

    return pptds
