from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase

WEB_IMAGE_FILENAME = "image.webp"


class CRUDWebImageFile(FileCRUDBase):
    """The image of an image document as lossless WebP, which every browser
    shows, whatever the format of the upload: `web_images/<sdoc_id>/image.webp`."""

    folder = "web_images"
    entity = Crud.SOURCE_DOCUMENT


crud_web_image_file = CRUDWebImageFile()
