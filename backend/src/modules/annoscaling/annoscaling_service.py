from time import perf_counter_ns
from typing import Any, Callable, Iterable, TypeVar

import numpy as np
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from modules.simsearch.simsearch_dto import SimSearchSentenceHit
from modules.simsearch.simsearch_service import SimSearchService
from repos.vector.weaviate_repo import WeaviateRepo

SimSearchHit = TypeVar("SimSearchHit")


# TODO: This should probably not use SimSearchSentenceHit! Instead, define own DTO


class AnnoScalingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sim = SimSearchService()
        cls.weaviate = WeaviateRepo()

        return super(AnnoScalingService, cls).__new__(cls)

    def confirm_suggestions(
        self,
        db: Session,
        project_id: int,
        user_id: int,
        code_id: int,
        reject_code_id: int,
        accept: list[tuple[int, int]],
        reject: list[tuple[int, int]],
    ):
        sdoc_ids = list({sdoc for sdoc, _ in accept + reject})
        sdoc_data = crud_sdoc_data.read_by_ids(db, ids=sdoc_ids)
        sdocs = {sdoc.id: sdoc for sdoc in sdoc_data}

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

    def __suggest_similar_sentences(
        self,
        proj_id: int,
        pos_sdoc_sent_ids: list[tuple[int, int]],
        neg_sdoc_sent_ids: list[tuple[int, int]],
        top_k: int,
    ) -> list[SimSearchSentenceHit]:
        # suggest
        hits: list[SimSearchSentenceHit] = []

        with self.weaviate.weaviate_session() as client:
            for sdoc_id, sent_id in pos_sdoc_sent_ids:
                search_result = crud_sentence_embedding.search_near_sentence(
                    client=client,
                    project_id=proj_id,
                    id=SentenceObjectIdentifier(sdoc_id=sdoc_id, sentence_id=sent_id),
                    k=top_k,
                    threshold=0.0,
                )
                hits.extend(
                    [
                        SimSearchSentenceHit(
                            sdoc_id=r.id.sdoc_id,
                            sentence_id=r.id.sentence_id,
                            score=r.score,
                        )
                        for r in search_result
                    ]
                )

            marked_sdoc_sent_ids = {
                entry for entry in pos_sdoc_sent_ids + neg_sdoc_sent_ids
            }
            hits = [
                h
                for h in hits
                if (h.sdoc_id, h.sentence_id) not in marked_sdoc_sent_ids
            ]
            hits.sort(key=lambda x: (x.sdoc_id, x.sentence_id))
            hits = self.__unique_consecutive(
                hits, key=lambda x: (x.sdoc_id, x.sentence_id)
            )
            candidates = [(h.sdoc_id, h.sentence_id) for h in hits]

            # suggest
            nearest: list[SimSearchSentenceHit] = []
            for sdoc_id, sent_id in candidates:
                search_result = crud_sentence_embedding.search_near_sentence(
                    client=client,
                    project_id=proj_id,
                    id=SentenceObjectIdentifier(sdoc_id=sdoc_id, sentence_id=sent_id),
                    k=1,
                    threshold=0.0,
                )
                nearest.extend(
                    [
                        SimSearchSentenceHit(
                            sdoc_id=r.id.sdoc_id,
                            sentence_id=r.id.sentence_id,
                            score=r.score,
                        )
                        for r in search_result
                    ]
                )

            results = []
            for hit, near in zip(hits, nearest):
                assert type(near) is SimSearchSentenceHit
                if (near.sdoc_id, near.sentence_id) not in neg_sdoc_sent_ids:
                    results.append(hit)
            results.sort(key=lambda x: x.score, reverse=True)
            return results[0 : min(len(results), top_k)]

    def __unique_consecutive(
        self, hits: list[SimSearchHit], key: Callable[[SimSearchHit], Any]
    ) -> list[SimSearchHit]:
        if len(hits) == 0:
            return []
        current = hits[0]
        result = [current]
        for hit in hits:
            if key(hit) != key(current):
                current = hit
                result.append(hit)
        return result

    def suggest(
        self,
        db: Session,
        project_id: int,
        user_ids: list[int],
        code_id: int,
        reject_code_id: int,
        top_k: int,
    ) -> list[tuple[int, int, str]]:
        start_time = perf_counter_ns()
        # takes 4ms (small project)
        occurrences = self.__get_annotations(db, project_id, user_ids, code_id)
        rejections = self.__get_annotations(db, project_id, user_ids, reject_code_id)
        end_time = perf_counter_ns()
        print("it took", end_time - start_time, "ns to get annotations from the DB")

        start_time = perf_counter_ns()
        # takes 2ms (small project)
        sdoc_sentences = self.__get_sentences(
            db=db, sdoc_ids={id for _, _, id in occurrences + rejections}
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
        hits = self.__suggest_similar_sentences(
            project_id, pos_sdoc_sent_ids, neg_sdoc_sent_ids, top_k
        )
        end_time = perf_counter_ns()
        print(
            "it took", end_time - start_time, "ns to get similar sentences from index"
        )
        sim_doc_sentences = self.__get_sentences(
            db=db, sdoc_ids={hit.sdoc_id for hit in hits}
        )

        results = []
        for hit in hits:
            starts, ends, content = sim_doc_sentences[hit.sdoc_id]
            text = content[starts[hit.sentence_id] : ends[hit.sentence_id]]
            results.append((hit.sdoc_id, hit.sentence_id, text))
        return results

    def __get_sdoc_sent_ids(
        self,
        spans: list[tuple[int, int, int]],
        sdoc_sentences: dict[int, tuple[list[int], list[int], str]],
    ) -> list[tuple[int, int]]:
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
        self, db: Session, project_id: int, user_ids: list[int], code_id: int
    ) -> list[tuple[int, int, int]]:
        query = (
            db.query(
                SpanAnnotationORM.begin,
                SpanAnnotationORM.end,
                AnnotationDocumentORM.source_document_id,
            )
            .join(
                AnnotationDocumentORM,
                SpanAnnotationORM.annotation_document_id == AnnotationDocumentORM.id,
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
        self, db: Session, sdoc_ids: Iterable[int]
    ) -> dict[int, tuple[list[int], list[int], str]]:
        sdoc_datas = crud_sdoc_data.read_by_ids(db, ids=list(sdoc_ids))
        result: dict[int, tuple[list[int], list[int], str]] = {}
        for sdoc in sdoc_datas:
            result[sdoc.id] = (
                sdoc.sentence_starts,
                sdoc.sentence_ends,
                sdoc.content,
            )

        return result

    def __best_match(self, starts: list[int], ends: list[int], begin: int, end: int):
        overlap = [self.__overlap(s, e, begin, end) for s, e in zip(starts, ends)]
        return np.asarray(overlap).argmax().item()

    def __overlap(self, s1: int, e1: int, s2: int, e2: int):
        return max(min(e1, e2) - max(s1, s2), 0)
