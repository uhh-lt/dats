from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase

# the WebP of an image document
IMAGE_FILENAME = "image.webp"
# the thumbnail of an image or video document
THUMBNAIL_FILENAME = "thumbnail.webp"


class CRUDThumbnailFile(FileCRUDBase):
    """The files of the thumbnail artefact: `thumbnails/<sdoc_id>/image.webp`
    (images) and `thumbnails/<sdoc_id>/thumbnail.webp` (images and videos)."""

    folder = "thumbnails"
    entity = Crud.SOURCE_DOCUMENT


crud_thumbnail_file = CRUDThumbnailFile()
