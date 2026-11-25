from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase

THUMBNAIL_FILENAME = "thumbnail.webp"


class CRUDThumbnailFile(FileCRUDBase):
    """The thumbnail of an image or video document:
    `thumbnails/<sdoc_id>/thumbnail.webp`."""

    folder = "thumbnails"
    entity = Crud.SOURCE_DOCUMENT


crud_thumbnail_file = CRUDThumbnailFile()
