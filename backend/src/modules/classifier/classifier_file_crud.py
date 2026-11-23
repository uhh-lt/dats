from common.crud_enum import Crud
from repos.filesystem.file_crud_base import FileCRUDBase

# the checkpoint of the trained model
MODEL_FILENAME = "model.ckpt"


class CRUDClassifierFile(FileCRUDBase):
    """The model of a classifier and the logs of its evaluations and inferences:
    `classifier_models/<classifier_id>/`."""

    folder = "classifier_models"
    entity = Crud.CLASSIFIER


crud_classifier_file = CRUDClassifierFile()
