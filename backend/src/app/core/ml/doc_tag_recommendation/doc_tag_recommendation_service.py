import statistics
from collections import defaultdict
from typing import Dict, Iterable, Iterator, List, Sequence, Set

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationMethod,
)
from app.core.data.dto.search import SimSearchDocumentHit
from app.core.data.orm.document_tag import DocumentTagORM
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
        return super(DocumentClassificationService, cls).__new__(cls)

    def classify_untagged_documents(
        self,
        ml_job_id: str,
        project_id: int,
        tag_ids: List[int] = [],
        method: DocumentTagRecommendationMethod = DocumentTagRecommendationMethod.KNN,
        multi_class: bool = False,
    ):
        """
        Classifies untagged documents by suggesting tags based on similar tagged documents.

        For each untagged document (determined by comparing against the IDs of documents that already have tags),
        the method finds similar (tagged) documents and uses their tags as predictions.
        A DocumentTagRecommendationLinkCreate DTO is created for each predicted tag.

        Args:
            task_id (int): The ID of the classification task.
            project_id (int): The project ID to limit the documents and tags.
            tag_ids (List[int]): The IDs of the tags to consider
            exclusive (bool): Whether tags are mutually exclusive, either A or B
        """
        with self.sqls.db_session() as db:
            # Fetch all documents that already have tags for the given project
            sdocs_with_tags = crud_sdoc.read_all_with_tags(
                db=db, project_id=project_id, tag_ids=tag_ids
            )
            # Extract IDs from the tagged documents
            sdoc_ids = {sdoc.id for sdoc in sdocs_with_tags}

            # Retrieve a mapping: document_id -> list of associated DocumentTagORM objects
            sdocs_and_tags = crud_document_tag.get_tags_for_documents(
                db, sdoc_ids=sdoc_ids
            )

        # Suggest similar documents based on the already tagged documents
        match method:
            case DocumentTagRecommendationMethod.EXCLUSIVE:
                dto_iter = self._exclusive_suggestions(
                    ml_job_id, project_id, sdoc_ids, sdocs_and_tags
                )
            case DocumentTagRecommendationMethod.KNN:
                dto_iter = self._knn_suggestions(
                    ml_job_id, project_id, list(sdoc_ids), sdocs_and_tags, tag_ids
                )
            case DocumentTagRecommendationMethod.SIMPLE:
                dto_iter = self._simple_suggestions(
                    ml_job_id, project_id, sdoc_ids, sdocs_and_tags
                )

        dtos = self._deduplicate_document_classifications(dto_iter, multi_class)

        # Insert all generated tag recommendation DTOs into the database at once.
        crud_document_tag_recommendation_link.create_multi(db=db, create_dtos=dtos)

    def _exclusive_suggestions(
        self,
        ml_job_id: str,
        project_id: int,
        sdoc_ids: Iterable[int],
        sdocs_and_tags: Dict[int, List[DocumentTagORM]],
    ) -> Iterator[DocumentTagRecommendationLinkCreate]:
        """get suggestions for each tag using documents with that tag as positive examples
        and all documents with another tag as negative examples"""
        tag_to_docs = defaultdict[int, list[int]](list[int])
        for sid, tags in sdocs_and_tags.items():
            for t in tags:
                tag_to_docs[t.id].append(sid)
        tag_to_similar = {t: list[SimSearchDocumentHit]() for t in tag_to_docs.keys()}
        for tag, similar_docs_per_tag in tag_to_similar.items():
            pos_sdocs_ids = set(tag_to_docs[tag])
            neg_sodc_ids_lists = [ids for t, ids in tag_to_docs.items() if t != tag]
            neg_sodc_ids = {item for items in neg_sodc_ids_lists for item in items}
            similar_docs = self.sim.suggest_similar_documents(
                proj_id=project_id,
                pos_sdoc_ids=pos_sdocs_ids,
                neg_sdoc_ids=neg_sodc_ids,
                top_k=10,
                unique=False,
            )
            # Filter out documents that already have tags (i.e. exclude those in sdoc_ids)
            similar_docs_per_tag.extend(
                (doc for doc in similar_docs if doc.sdoc_id not in sdoc_ids)
            )
        # all_suggested_sdoc_ids = [doc.sdoc_id for docs in tag_to_similar.values() for doc in docs]
        # sdocs_and_tags = crud_sdoc.get_tags(db, sdoc_ids=all_suggested_sdoc_ids)
        for tag, similar_docs_per_tag in tag_to_similar.items():
            for hit in similar_docs_per_tag:
                yield DocumentTagRecommendationLinkCreate(
                    ml_job_id=ml_job_id,
                    source_document_id=hit.sdoc_id,
                    predicted_tag_id=tag,
                    is_reviewed=False,
                    prediction_score=hit.score,
                )

    def _knn_suggestions(
        self,
        ml_job_id: str,
        project_id: int,
        sdoc_ids: Sequence[int],
        sdocs_and_tags: Dict[int, List[DocumentTagORM]],
        tag_ids: List[int],
    ) -> Iterator[DocumentTagRecommendationLinkCreate]:
        """create suggestions using k-nearest neighbors"""
        with self.sqls.db_session() as db:
            sdocs_without_tags = crud_sdoc.read_all_without_tags(
                db=db, project_id=project_id, tag_ids=tag_ids
            )
        sdoc_ids_to_classify = [sdoc.id for sdoc in sdocs_without_tags]

        nns = self.sim.knn_documents(project_id, sdoc_ids_to_classify, sdoc_ids, k=5)

        for nn, sdoc in zip(nns, sdoc_ids_to_classify):
            pairs = [
                (item.id, items.score)
                for items in nn
                for item in sdocs_and_tags[items.sdoc_id]
            ]
            scores = defaultdict[int, list[float]](list)
            for id, score in pairs:
                scores[id].append(score)
            best = max(scores.items(), key=lambda x: sum(x[1]))
            yield DocumentTagRecommendationLinkCreate(
                ml_job_id=ml_job_id,
                source_document_id=sdoc,
                predicted_tag_id=best[0],
                is_reviewed=False,
                prediction_score=statistics.fmean(best[1]),
            )

    def _simple_suggestions(
        self,
        ml_job_id: str,
        project_id: int,
        sdoc_ids: Set[int],
        sdocs_and_tags: Dict[int, List[DocumentTagORM]],
    ) -> Iterator[DocumentTagRecommendationLinkCreate]:
        """simply get suggestions only using positive examples"""
        similar_docs = self.sim.suggest_similar_documents(
            proj_id=project_id,
            pos_sdoc_ids=sdoc_ids,
            neg_sdoc_ids=set(),
            top_k=10,
            unique=False,
        )
        # Filter out documents that already have tags (i.e. exclude those in sdoc_ids)
        similar_docs = [doc for doc in similar_docs if doc.sdoc_id not in sdoc_ids]

        # Process each similar (untagged) document
        for similar_doc in similar_docs:
            # Retrieve the tags from the compared (tagged) document using its ID as key.
            # If no tags are found, skip this similar_doc.
            tags = sdocs_and_tags.get(similar_doc.compared_sdoc_id, None)
            if not tags:
                continue

            # For each tag associated with the compared (tagged) document, create a prediction.
            for tag in tags:
                yield DocumentTagRecommendationLinkCreate(
                    ml_job_id=ml_job_id,
                    source_document_id=similar_doc.sdoc_id,
                    predicted_tag_id=tag.id,
                    is_reviewed=False,
                    prediction_score=similar_doc.score,
                )

    def _deduplicate_document_classifications(
        self,
        dtos: Iterable[DocumentTagRecommendationLinkCreate],
        multi_class: bool,
    ) -> List[DocumentTagRecommendationLinkCreate]:
        """
        Deduplicates document tag classification recommendations.

        This method is necessary because when documents are compared in vector space,
        multiple documents can have the same tags and neighbors, which can lead to
        duplicate recommendations. This method ensures that only unique recommendations
        are kept by retaining the entry with the highest prediction score for each
        combination of source document (and predicted tag).

        Args:
            dtos (List[DocumentTagRecommendationLinkCreate]):
                A list of DocumentTagRecommendationLinkCreate DTOs representing
                the predicted tag classifications for documents.
            multi_class (bool):
                Allow multiple tags per source document if `True`,
                else only the single best tag per source document.

        Returns:
            List[DocumentTagRecommendationLinkCreate]:
                A list of deduplicated DocumentTagRecommendationLinkCreate DTOs,
                containing only the unique recommendations with the highest prediction scores.
        """
        # Create a dictionary to store the deduplicated entries
        deduplicated_entries = {}

        # Iterate over the dtos and only keep the entry with the highest prediction_score
        for dto in dtos:
            key = (
                (dto.source_document_id, dto.predicted_tag_id)
                if multi_class
                else dto.source_document_id
            )

            # If the key does not exist yet or the current score is higher, store the entry
            if (
                key not in deduplicated_entries
                or dto.prediction_score > deduplicated_entries[key].prediction_score
            ):
                deduplicated_entries[key] = dto

        # The deduplicated entries are now the values of the dictionary
        return list(deduplicated_entries.values())
