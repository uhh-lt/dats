from collections import Counter

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from modules.keyword_statistics.keyword_statistics_dto import KeywordStat
from modules.keyword_statistics.keywords_artefact import KEYWORDS


class KeywordStatisticsService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(KeywordStatisticsService, cls).__new__(cls)

    def compute_keyword_statistics(
        self, *, db: Session, project_id: int, sdoc_ids: set[int], top_k: int = 20
    ) -> list[KeywordStat]:
        # 1. the keywords of all documents of the project
        all_keywords_metadata = KEYWORDS.store.read_by_project(
            db=db, project_id=project_id
        )
        all_keywords = self._count_keywords(all_keywords_metadata)

        # 2. the keywords of the filtered documents
        topk_filtered_keywords = self._count_keywords(
            [m for m in all_keywords_metadata if m.source_document_id in sdoc_ids],
            top_k=top_k,
        )

        # 3. construct result
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
