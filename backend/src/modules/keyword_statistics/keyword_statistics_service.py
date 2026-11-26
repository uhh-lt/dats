from collections import Counter

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from modules.keyword_statistics.keyword_statistics_dto import KeywordStat
from modules.keyword_statistics.keywords_artefact import KEYWORDS_METADATA_KEY


class KeywordStatisticsService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(KeywordStatisticsService, cls).__new__(cls)

    def compute_keyword_statistics(
        self, *, db: Session, project_id: int, sdoc_ids: set[int], top_k: int = 20
    ) -> list[KeywordStat]:
        # 1. query keyword project metadadta
        project_metadata = crud_project_meta.read_by_project_and_key(
            db=db, project_id=project_id, key=KEYWORDS_METADATA_KEY
        )
        project_metadata_ids = [pm.id for pm in project_metadata]
        if len(project_metadata_ids) == 0:
            return []

        # 2. query keyword metadata for the sdoc_ids
        filtered_keywords_metadata = (
            db.query(SourceDocumentMetadataORM)
            .filter(
                SourceDocumentMetadataORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id.in_(project_metadata_ids),
                SourceDocumentMetadataORM.source_document_id.in_(sdoc_ids),
            )
            .all()
        )
        topk_filtered_keywords = self._count_keywords(
            filtered_keywords_metadata, top_k=top_k
        )

        # 3. query keyword metadata for all sdocs
        all_keywords_metadata = (
            db.query(SourceDocumentMetadataORM)
            .filter(
                SourceDocumentMetadataORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id.in_(project_metadata_ids),
            )
            .all()
        )
        all_keywords = self._count_keywords(all_keywords_metadata)

        # 4. construct result
        return [
            KeywordStat(
                keyword=keyword,
                filtered_count=count,
                global_count=all_keywords[keyword],
            )
            for keyword, count in topk_filtered_keywords.items()
        ]

    def _count_keywords(
        self,
        keyword_metadata: list[SourceDocumentMetadataORM],
        top_k: int | None = None,
    ) -> dict[str, int]:
        # get keyword lists per sdoc
        keywords_list = [
            x.list_value for x in keyword_metadata if x.list_value is not None
        ]
        # flatten the list
        keywords = [
            keyword for keyword_list in keywords_list for keyword in keyword_list
        ]
        # count the keywords
        if top_k is None:
            return dict(Counter(keywords))
        else:
            return dict(Counter(keywords).most_common(top_k))
