from io import BytesIO
from pathlib import Path

from PIL import Image

from core.artefacts.thumbnail.thumbnail_file_crud import (
    IMAGE_FILENAME,
    THUMBNAIL_FILENAME,
    crud_thumbnail_file,
)


def webp_bytes(image: Image.Image) -> bytes:
    """The image as lossless WebP."""
    buffer = BytesIO()
    image.save(buffer, "WEBP", quality=50, lossless=True, method=6)
    return buffer.getvalue()


def generate_thumbnails(*, project_id: int, sdoc_id: int, image_path: Path) -> None:
    """Writes the WebP and the thumbnail of the image document."""
    with Image.open(image_path) as im:
        crud_thumbnail_file.write(
            project_id=project_id, id=sdoc_id, name=IMAGE_FILENAME, data=webp_bytes(im)
        )
        im.thumbnail((256, 256))
        crud_thumbnail_file.write(
            project_id=project_id,
            id=sdoc_id,
            name=THUMBNAIL_FILENAME,
            data=webp_bytes(im),
        )
