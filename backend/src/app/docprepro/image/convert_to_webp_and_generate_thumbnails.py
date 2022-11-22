import os
from pathlib import Path
from typing import List

from PIL import Image
from tqdm import tqdm

from app.core.data.dto.source_document import SDocStatus
from app.core.data.repo.repo_service import RepoService
from app.docprepro.image import PreProImageDoc
from app.docprepro.util import update_sdoc_status

repo = RepoService()


def convert_to_webp(path: Path,
                    webp: bool = True,
                    webp_quality: int = 50,
                    remove_original: bool = True,
                    thumbnails: bool = True,
                    thumbnail_size: int = 120):
    with Image.open(path) as im:
        if webp:
            im.save(path.with_name(repo.generate_sdoc_filename(path.name, webp=True)), "WEBP", quality=webp_quality, lossless=True, method=6)
        if thumbnails:
            im.thumbnail((thumbnail_size, thumbnail_size))
            im.save(path.with_name(repo.generate_sdoc_filename(path.name, webp=True, thumbnail=True)), "WEBP", quality=85, lossless=True, method=6)
    if remove_original:
        os.remove(path)


def convert_to_webp_and_generate_thumbnails_(ppids: List[PreProImageDoc]) -> List[PreProImageDoc]:
    for ppid in tqdm(ppids, desc="Converting images to .webp and generating thumbnails"):
        convert_to_webp(path=ppid.image_dst,
                        webp=True,
                        remove_original=False,
                        thumbnails=True,
                        thumbnail_size=256)
        update_sdoc_status(sdoc_id=ppid.sdoc_id, sdoc_status=SDocStatus.convert_to_webp_and_generate_thumbnails)

    return ppids
