from enum import Enum

from core.doc.source_document_crud import crud_sdoc
from modules.classifier.classifier_crud import crud_classifier
from modules.perspectives.aspect_crud import crud_aspect


class Crud(Enum):
    """The entities that own a folder of files (`FileCRUDBase.entity`)."""

    ASPECT = crud_aspect
    CLASSIFIER = crud_classifier
    SOURCE_DOCUMENT = crud_sdoc
