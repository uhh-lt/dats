from typing import Dict, List, Tuple

from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta
from app.core.search.simsearch_service import SimSearchService
import numpy as np

from app.core.data.orm import (
    SpanAnnotationORM,
    SourceDocumentORM,
    AnnotationDocumentORM,
    CurrentCodeORM,
    SourceDocumentDataORM,
)


class AnnoScalingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        cls.sim = SimSearchService()

        return super(AnnoScalingService, cls).__new__(cls)

    def suggest(self, project_id: int, user_ids: List[int], code_id: int) -> List[str]:
        occurrences = self.__get_annotations(project_id, user_ids, code_id)
        sdoc_sentences = self.__get_sentences({id for _,_, id in occurrences})

        sdoc_sent_ids = []
        for start, end, sdoc_id in occurrences:
            # TODO loops are bad, need a much faster way to link annotations to sentences
            # best: do everything in DB and only return sentence ID per annotation
            # alternative: load all from DB (in chunks?) and compute via numpy 
            starts, ends, _ = sdoc_sentences[sdoc_id]
            sent_match = self.__best_match(
                starts, ends, start, end
            )
            sdoc_sent_ids.append((sdoc_id, sent_match))
        hits = self.sim.suggest_similar_sentences(project_id, sdoc_sent_ids)
        sim_doc_sentences = self.__get_sentences({hit.sdoc_id for hit in hits})

        texts = []
        for hit in hits:
            starts, ends, content = sim_doc_sentences[hit.sdoc_id]
            texts.append(content[starts[hit.sentence_id] : ends[hit.sentence_id]])
        return texts

    def __get_annotations(self, project_id: int, user_ids: List[int], code_id: int):
        with self.sqls.db_session() as db:
            query = (
                db.query(
                    SpanAnnotationORM,
                    SourceDocumentORM.id,
                )
                .join(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                )
                .join(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    CurrentCodeORM,
                    CurrentCodeORM.id == SpanAnnotationORM.current_code_id,
                )
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    CurrentCodeORM.code_id == code_id,
                )
            )
            res = query.all()
            return [(r[0].begin, r[0].end, r[1]) for r in res]
    
    def __get_sentences(self, sdoc_ids : List[int]) -> Dict[int, Tuple[List[int], List[int]]]:
        with self.sqls.db_session() as db:
            query = db.query(SourceDocumentDataORM.id, SourceDocumentDataORM.sentence_starts, SourceDocumentDataORM.sentence_ends, SourceDocumentDataORM.content).filter(SourceDocumentDataORM.id.in_(sdoc_ids))
            res = query.all()
            return {r[0]: (r[1], r[2], r[3]) for r in res}


    def __best_match(self, starts: List[int], ends: List[int], begin: int, end: int):
        overlap = [self.__overlap(s,e , begin, end) for s,e in zip(starts, ends)]
        return np.asarray(overlap).argmax().item()

    def __overlap(self, s1: int, e1: int, s2: int, e2: int):
        return max(min(e1, e2) - max(s1, s2), 0)
