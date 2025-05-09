from time import perf_counter_ns
from typing import Dict, Iterable, List, Tuple

import numpy as np
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.db.simsearch_service import SimSearchService
from app.core.db.sql_service import SQLService

# from app.core.search.typesense_service import TypesenseService
from app.util.singleton_meta import SingletonMeta


class AnnoScalingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        cls.sim = SimSearchService()

        return super(AnnoScalingService, cls).__new__(cls)

    def confirm_suggestions(
        self,
        project_id: int,
        user_id: int,
        code_id: int,
        reject_code_id: int,
        accept: List[Tuple[int, int]],
        reject: List[Tuple[int, int]],
    ):
        sdoc_ids = {sdoc for sdoc, _ in accept + reject}

        with self.sqls.db_session() as db:
            sdocs = (
                db.query(SourceDocumentDataORM)
                .filter(SourceDocumentDataORM.id.in_(sdoc_ids))
                .all()
            )
            sdocs = {sdoc.id: sdoc for sdoc in sdocs}

            to_create = []

            for sdoc_id, sent in accept:
                sdoc = sdocs[sdoc_id]
                begin_char = sdoc.sentence_starts[sent]
                end_char = sdoc.sentence_ends[sent]
                span_anno = SpanAnnotationCreate(
                    code_id=code_id,
                    sdoc_id=sdoc_id,
                    begin=begin_char,
                    end=end_char,
                    begin_token=sdoc.sentence_token_starts[sent],
                    end_token=sdoc.sentence_token_ends[sent],
                    span_text=sdoc.content[begin_char:end_char],
                )
                to_create.append(span_anno)

            for sdoc_id, sent in reject:
                sdoc = sdocs[sdoc_id]
                begin_char = sdoc.sentence_starts[sent]
                end_char = sdoc.sentence_ends[sent]
                span_anno = SpanAnnotationCreate(
                    code_id=reject_code_id,
                    sdoc_id=sdoc_id,
                    begin=begin_char,
                    end=end_char,
                    begin_token=sdoc.sentence_token_starts[sent],
                    end_token=sdoc.sentence_token_ends[sent],
                    span_text=sdoc.content[begin_char:end_char],
                )
                to_create.append(span_anno)

            crud_span_anno.create_bulk(db, user_id=user_id, create_dtos=to_create)

    def suggest(
        self,
        project_id: int,
        user_ids: List[int],
        code_id: int,
        reject_code_id: int,
        top_k: int,
    ) -> List[Tuple[int, int, str]]:
        start_time = perf_counter_ns()
        # takes 4ms (small project)
        occurrences = self.__get_annotations(project_id, user_ids, code_id)
        rejections = self.__get_annotations(project_id, user_ids, reject_code_id)
        end_time = perf_counter_ns()
        print("it took", end_time - start_time, "ns to get annotations from the DB")

        start_time = perf_counter_ns()
        # takes 2ms (small project)
        sdoc_sentences = self.__get_sentences(
            {id for _, _, id in occurrences + rejections}
        )
        end_time = perf_counter_ns()
        print("it took", end_time - start_time, "ns to get sentences from the DB")

        start_time = perf_counter_ns()
        pos_sdoc_sent_ids = self.__get_sdoc_sent_ids(occurrences, sdoc_sentences)
        neg_sdoc_sent_ids = self.__get_sdoc_sent_ids(rejections, sdoc_sentences)

        end_time = perf_counter_ns()
        print("it took", end_time - start_time, "ns to match annotations to sentences")
        start_time = perf_counter_ns()
        # takes around 20ms per object. so, 50 annotations take already 1 full second
        hits = self.sim.suggest_similar_sentences(
            project_id, pos_sdoc_sent_ids, neg_sdoc_sent_ids, top_k
        )
        end_time = perf_counter_ns()
        print(
            "it took", end_time - start_time, "ns to get similar sentences from index"
        )
        sim_doc_sentences = self.__get_sentences({hit.sdoc_id for hit in hits})

        results = []
        for hit in hits:
            starts, ends, content = sim_doc_sentences[hit.sdoc_id]
            text = content[starts[hit.sentence_id] : ends[hit.sentence_id]]
            results.append((hit.sdoc_id, hit.sentence_id, text))
        return results

    def __get_sdoc_sent_ids(
        self,
        spans: List[Tuple[int, int, int]],
        sdoc_sentences: Dict[int, Tuple[List[int], List[int], str]],
    ) -> List[Tuple[int, int]]:
        sdoc_sent_ids = []
        # takes around 0.1ms per annotation
        for start, end, sdoc_id in spans:
            # TODO loops are bad, need a much faster way to link annotations to sentences
            # best: do everything in DB and only return sentence ID per annotation
            # alternative: load all from DB (in chunks?) and compute via numpy
            starts, ends, _ = sdoc_sentences[sdoc_id]
            sent_match = self.__best_match(starts, ends, start, end)
            sdoc_sent_ids.append((sdoc_id, sent_match))
        return sdoc_sent_ids

    def __get_annotations(
        self, project_id: int, user_ids: List[int], code_id: int
    ) -> List[Tuple[int, int, int]]:
        with self.sqls.db_session() as db:
            query = (
                db.query(
                    SpanAnnotationORM.begin,
                    SpanAnnotationORM.end,
                    AnnotationDocumentORM.source_document_id,
                )
                .join(
                    AnnotationDocumentORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                )
                .join(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id.in_(user_ids),
                    SpanAnnotationORM.code_id == code_id,
                )
            )
            res = query.all()
            return [(r[0], r[1], r[2]) for r in res]

    def __get_sentences(
        self, sdoc_ids: Iterable[int]
    ) -> Dict[int, Tuple[List[int], List[int], str]]:
        with self.sqls.db_session() as db:
            query = db.query(
                SourceDocumentDataORM.id,
                SourceDocumentDataORM.sentence_starts,
                SourceDocumentDataORM.sentence_ends,
                SourceDocumentDataORM.content,
            ).filter(SourceDocumentDataORM.id.in_(sdoc_ids))
            res = query.all()
            return {r[0]: (r[1], r[2], r[3]) for r in res}

    def __best_match(self, starts: List[int], ends: List[int], begin: int, end: int):
        overlap = [self.__overlap(s, e, begin, end) for s, e in zip(starts, ends)]
        return np.asarray(overlap).argmax().item()

    def __overlap(self, s1: int, e1: int, s2: int, e2: int):
        return max(min(e1, e2) - max(s1, s2), 0)
