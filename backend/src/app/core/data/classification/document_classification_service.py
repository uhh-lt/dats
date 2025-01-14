from loguru import logger

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkCreate,
)
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class ClassificationService(metaclass=SingletonMeta):
    """
    Singleton class for managing document classification jobs.
    This service is responsible for preparing and executing
    classification tasks on source documents and managing the
    associated data.
    """

    def __new__(cls, *args, **kwargs):
        """
        Create a new instance of ClassificationService. If the
        instance already exists, return the existing instance.

        Returns:
            ClassificationService: An instance of the class.
        """
        cls.sqls: SQLService = SQLService()
        return super(ClassificationService, cls).__new__(cls)

    def _prepare_classification_job(self):
        """
        Prepare the classification job by fetching all tags and
        documents associated with a given project. This method would
        handle untagged documents and initialize the classification job.
        """
        pass

    def perform_dummy_classification(self, task_id: int, project_id: int):
        dtos = []
        try:
            with self.sqls.db_session() as db:
                # Retrieve all documents for the project
                sdocs = [
                    SourceDocumentRead.model_validate(sdoc)
                    for sdoc in crud_sdoc.read_by_project(db=db, proj_id=project_id)
                ]
                tags = crud_document_tag.get_tags_by_project(db, project_id)
                # Pseudo-tagging

                for sdoc in sdocs:
                    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc.id)
                    tagged_doc = {
                        "document": [sdoc, sdoc_data],
                        "predicted_tag": tags[0],
                        "score": 0.99,
                    }
                    if tagged_doc["predicted_tag"]:  # Check if we have a tag
                        # Classify
                        sdoc_id = tagged_doc["document"][0].id
                        dtos.append(
                            DocumentTagRecommendationLinkCreate(
                                task_id=task_id,
                                source_document_id=sdoc_id,
                                predicted_tag_id=tagged_doc["predicted_tag"].id,
                                is_accepted=False,
                                prediction_score=tagged_doc["score"],
                            )
                        )

                crud_document_tag_recommendation_link.create_multi(
                    db=db, create_dtos=dtos
                )

        except Exception as e:
            logger.error(f"Cannot finish document tag classification: {e}")
