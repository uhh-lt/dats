from typing import List

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkCreate,
)
from app.core.db.simsearch_service import SimSearchService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class DocumentClassificationService(metaclass=SingletonMeta):
    """
    Singleton class for managing document classification jobs.
    This service is responsible for preparing and executing
    classification tasks on source documents and managing the
    associated data.
    """

    def __new__(cls, *args, **kwargs):
        """
        Create a new instance of DocumentClassificationService. If the
        instance already exists, return the existing instance.

        Returns:
            DocumentClassificationService: An instance of the class.
        """
        cls.sqls: SQLService = SQLService()
        cls.sim: SimSearchService = SimSearchService()
        cls.used_model = "Similiarity Search"
        return super(DocumentClassificationService, cls).__new__(cls)

    def classify_untagged_documents(self, ml_job_id: str, project_id: int):
        """
        Classifies untagged documents by suggesting tags based on similar tagged documents.

        For each untagged document (determined by comparing against the IDs of documents that already have tags),
        the method finds similar (tagged) documents and uses their tags as predictions.
        A DocumentTagRecommendationLinkCreate DTO is created for each predicted tag.

        Args:
            task_id (int): The ID of the classification task.
            project_id (int): The project ID to limit the documents and tags.
        """
        dtos = []  # List to hold DTOs to be inserted into the database
        with self.sqls.db_session() as db:
            # Fetch all documents that already have tags for the given project
            sdocs_with_tags = [
                sdoc
                for sdoc in crud_sdoc.read_all_with_tags(db=db, project_id=project_id)
            ]
        # Extract IDs from the tagged documents
        sdoc_ids = [sdoc.id for sdoc in sdocs_with_tags]

        # Retrieve a mapping: document_id -> list of associated DocumentTagORM objects
        sdocs_and_tags = crud_document_tag.get_tags_for_documents(db, sdoc_ids=sdoc_ids)

        # Suggest similar documents based on the already tagged documents
        similar_docs = self.sim.suggest_similar_documents(
            proj_id=project_id, sdoc_ids=sdoc_ids, top_k=10
        )

        # Filter out documents that already have tags (i.e. exclude those in sdoc_ids)
        filtered_similar_docs = [
            doc for doc in similar_docs if doc.sdoc_id not in sdoc_ids
        ]
        # Process each similar (untagged) document
        for similar_doc in (
            filtered_similar_docs
        ):  # Retrieve the tags from the compared (tagged) document using its ID as key.
            # If no tags are found, skip this similar_doc.
            tags = sdocs_and_tags.get(similar_doc.compared_sdoc_id, None)
            if not tags:
                continue

            # For each tag associated with the compared (tagged) document, create a prediction.
            for tag in tags:
                dtos.append(
                    DocumentTagRecommendationLinkCreate(
                        ml_job_id=ml_job_id,
                        source_document_id=similar_doc.sdoc_id,
                        predicted_tag_id=tag.id,
                        is_reviewed=False,
                        prediction_score=similar_doc.score,
                    )
                )

        dtos = self._deduplicate_document_classifications(dtos)

        # Insert all generated tag recommendation DTOs into the database at once.
        crud_document_tag_recommendation_link.create_multi(db=db, create_dtos=dtos)

    def _deduplicate_document_classifications(
        self, dtos: List[DocumentTagRecommendationLinkCreate]
    ) -> List[DocumentTagRecommendationLinkCreate]:
        """
        Deduplicates document tag classification recommendations.

        This method is necessary because when documents are compared in vector space,
        multiple documents can have the same tags and neighbors, which can lead to
        duplicate recommendations. This method ensures that only unique recommendations
        are kept by retaining the entry with the highest prediction score for each
        combination of source document and predicted tag.

        Args:
            dtos (List[DocumentTagRecommendationLinkCreate]):
                A list of DocumentTagRecommendationLinkCreate DTOs representing
                the predicted tag classifications for documents.

        Returns:
            List[DocumentTagRecommendationLinkCreate]:
                A list of deduplicated DocumentTagRecommendationLinkCreate DTOs,
                containing only the unique recommendations with the highest prediction scores.
        """
        # Create a dictionary to store the deduplicated entries
        deduplicated_entries = {}

        # Iterate over the dtos and only keep the entry with the highest prediction_score
        for dto in dtos:
            key = (dto.source_document_id, dto.predicted_tag_id)

            # If the key does not exist yet or the current score is higher, store the entry
            if (
                key not in deduplicated_entries
                or dto.prediction_score > deduplicated_entries[key].prediction_score
            ):
                deduplicated_entries[key] = dto

        # The deduplicated entries are now the values of the dictionary
        return list(deduplicated_entries.values())
