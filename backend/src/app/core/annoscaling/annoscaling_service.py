from typing import List, Tuple
from app.core.analysis.analysis_service import AnalysisService
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta
from app.core.data.dto.analysis import AnnotationOccurrence
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
import numpy as np


class AnnoScalingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo = RepoService()
        cls.sqls = SQLService()
        cls.analysis = AnalysisService()
        cls.es = ElasticSearchService()
        cls.sim = SimSearchService()

        return super(AnnoScalingService, cls).__new__(cls)
    
    def suggest(
        self, project_id: int, user_ids: List[int], code_id: int
    ) -> List[str]:
        occurrences: List[AnnotationOccurrence] = self.analysis.find_annotation_occurrences(project_id, user_ids, code_id)
        sdoc_sentences = {o.sdoc.id: None for o in occurrences}
        for sid in sdoc_sentences.keys():
            sents = self.es.get_sdoc_sentences_by_sdoc_id(proj_id=project_id, sdoc_id=sid, sentence_offsets=True)
            sdoc_sentences[sid] = (sents.sentences, sents.sentence_character_offsets)
        
        sdoc_ids = []
        sent_ids = []
        for o in occurrences:
            offsets = sdoc_sentences[o.sdoc.id][1]
            sent_match = self.__best_match(offsets, o.annotation.begin, o.annotation.end)
            sdoc_ids.append(o.sdoc.id)
            sent_ids.append(sent_match)
        hits = self.sim.suggest_similar_sentences(project_id, sdoc_ids, sent_ids)
        texts = []
        for hit in hits:
            sds = self.es.get_sdoc_sentences_by_sdoc_id(proj_id=project_id, sdoc_id=hit.sdoc_id)
            texts.append(sds.sentences[hit.sentence_id])
        return texts
    
    def __best_match(self, offsets: List[Tuple[int, int]], begin: int, end: int):
        overlap = [self.__overlap(*o, begin, end) for o in offsets]
        return np.asarray(overlap).argmax()

    def __overlap(self, s1: int, e1: int, s2: int, e2: int):
        return max(min(e1,e2) - max(s1,s2),0)

