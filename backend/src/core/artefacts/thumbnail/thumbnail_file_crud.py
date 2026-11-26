from core.doc.source_document_orm import SourceDocumentORM
from repos.filesystem.file_crud_base import FileCRUDBase

THUMBNAIL_FILENAME = "thumbnail.webp"


class CRUDThumbnailFile(FileCRUDBase):
    """The thumbnail of an image or video document:
    `thumbnails/<sdoc_id>/thumbnail.webp`."""

    folder = "thumbnails"
    owner = SourceDocumentORM


crud_thumbnail_file = CRUDThumbnailFile()
