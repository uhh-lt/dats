from pathlib import Path

from PIL import Image

from repos.filesystem_repo import FilesystemRepo

fsr = FilesystemRepo()


def generate_thumbnails(image_path: Path):
    with Image.open(image_path) as im:
        web_p_fn = fsr.generate_sdoc_filename(image_path, webp=True, thumbnail=False)
        # convert to webp
        im.save(
            web_p_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
        # create thumbnail
        thumbnail_fn = fsr.generate_sdoc_filename(image_path, webp=True, thumbnail=True)
        im.thumbnail((256, 256))
        im.save(
            thumbnail_fn,
            "WEBP",
            quality=50,
            lossless=True,
            method=6,
        )
