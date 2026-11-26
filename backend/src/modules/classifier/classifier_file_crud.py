from modules.classifier.classifier_orm import ClassifierORM
from repos.filesystem.file_crud_base import FileCRUDBase

# the checkpoint of the trained model
MODEL_FILENAME = "model.ckpt"


class CRUDClassifierFile(FileCRUDBase):
    """The model of a classifier and the logs of its evaluations and inferences:
    `classifier_models/<classifier_id>/`."""

    folder = "classifier_models"
    owner = ClassifierORM


crud_classifier_file = CRUDClassifierFile()
