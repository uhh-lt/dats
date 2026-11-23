from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase


class CRUDCotaFile(FileCRUDBase):
    """The models a refinement of a concept over time analysis trains:
    `cota_models/<cota_id>/`."""

    folder = "cota_models"
    entity = Crud.COTA_ANALYSIS


crud_cota_file = CRUDCotaFile()
