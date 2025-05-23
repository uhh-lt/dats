from datetime import datetime
from typing import Dict, List, NamedTuple, Tuple
from uuid import uuid4

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.source_document_job_status import crud_sdoc_job_status
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document_job_status import SourceDocumentJobStatusCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreateIntern
from app.core.data.dto.span_group import SpanGroupCreateIntern
from app.core.data.meta_type import MetaType
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_job_status import (
    JobStatus,
    JobType,
    SourceDocumentJobStatusORM,
)
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.db.sql_service import SQLService
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.quote import (
    QuoteInputDoc,
    QuoteJobInput,
    Span,
    Token,
)
from app.util.singleton_meta import SingletonMeta
from loguru import logger
from sqlalchemy import ColumnElement, and_
from sqlalchemy.orm import Session


class _CodeQuoteId(NamedTuple):
    quote: int
    direct: int
    indirect: int
    reported: int
    frin: int
    infr: int
    frame: int
    speaker: int
    addr: int
    cue: int


class QuoteService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()
        return super(QuoteService, cls).__new__(cls)

    def perform_quotation_detection(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        with self.sqls.db_session() as db:
            codes = _CodeQuoteId(
                quote=self._get_code_id(db, "QUOTE", project_id),
                direct=self._get_code_id(db, "DIRECT", project_id),
                indirect=self._get_code_id(db, "INDIRECT", project_id),
                reported=self._get_code_id(db, "REPORTED", project_id),
                frin=self._get_code_id(db, "FREE_INDIRECT", project_id),
                infr=self._get_code_id(db, "INDIRECT_FREE_INDIRECT", project_id),
                frame=self._get_code_id(db, "FRAME", project_id),
                speaker=self._get_code_id(db, "SPEAKER", project_id),
                addr=self._get_code_id(db, "ADDRESSEE", project_id),
                cue=self._get_code_id(db, "CUE", project_id),
            )
            language_metadata = (
                crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                    db,
                    project_id,
                    "language",
                    MetaType.STRING.value,
                    DocType.text.value,
                )
            )
        if language_metadata is None:
            raise ValueError("error with project, no language metadata available")

        total_processed = 0
        num_processed = -1
        while num_processed != 0:
            num_processed = self._process_batch(
                filter_criterion,
                project_id,
                codes,
                language_metadata.id,
                recompute,
            )
            total_processed = +num_processed
        return total_processed

    def _process_batch(
        self,
        filter_criterion: ColumnElement,
        project_id: int,
        code: _CodeQuoteId,
        language_metadata_id: int,
        recompute: bool = False,
    ):
        with self.sqls.db_session() as db:
            query = (
                db.query(SourceDocumentDataORM)
                .join(
                    SourceDocumentMetadataORM,
                    SourceDocumentMetadataORM.source_document_id
                    == SourceDocumentDataORM.id,
                )
                .outerjoin(
                    SourceDocumentJobStatusORM,
                    and_(
                        SourceDocumentJobStatusORM.id == SourceDocumentDataORM.id,
                        SourceDocumentJobStatusORM.type
                        == JobType.QUOTATION_ATTRIBUTION,
                    ),
                    full=True,
                )
                .filter(filter_criterion)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id
                    == language_metadata_id,
                    SourceDocumentMetadataORM.str_value == "de",
                )
                .limit(10)
            )
            sdoc_data = query.all()
        sdoc_data = [doc for doc in sdoc_data if doc is not None]
        num_docs = len(sdoc_data)

        if num_docs == 0:
            return num_docs

        quote_input = QuoteJobInput(
            id=1,
            project_id=project_id,
            documents=[
                QuoteInputDoc(
                    id=sd.id,
                    text=sd.content,
                    tokens=[
                        Token(start=start, end=end, sent=sid, text=text)
                        for start, end, sid, text in zip(
                            sd.token_starts,
                            sd.token_ends,
                            sd.token_sentence_ids,
                            sd.tokens,
                        )
                    ],
                    sentences=[
                        Span(start=start, end=end + 1, text=text)
                        for start, end, text in zip(
                            sd.sentence_token_starts,
                            sd.sentence_token_ends,
                            sd.sentences,
                        )
                    ],
                )
                for sd in sdoc_data
            ],
        )

        sdoc_by_id = {sdoc.id: sdoc for sdoc in sdoc_data}

        quote_output = self.rms.quote_prediction(quote_input)

        with self.sqls.db_session() as db:
            if recompute:
                subquery = (
                    db.query(SpanAnnotationORM.id)
                    .join(SpanAnnotationORM.annotation_document)
                    .filter(
                        AnnotationDocumentORM.user_id == SYSTEM_USER_ID,
                        AnnotationDocumentORM.source_document_id.in_(
                            [sdoc.id for sdoc in sdoc_data]
                        ),
                        SpanAnnotationORM.code_id.in_(list(code)),
                    )
                    .scalar_subquery()
                )
                db.query(SpanAnnotationORM).where(
                    SpanAnnotationORM.id.in_(subquery)
                ).delete()

            span_dtos: List[SpanAnnotationCreateIntern] = []
            group_dtos: List[SpanGroupCreateIntern] = []
            group2annos: List[Tuple[int, int]] = []
            last_anno_count = 0
            for doc in quote_output.documents:
                adoc = crud_adoc.exists_or_create(
                    db, user_id=SYSTEM_USER_ID, sdoc_id=doc.id
                )
                sdoc = sdoc_by_id[doc.id]
                for quote in doc.quotes:
                    qt = self._get_quote_type(quote.typ, code)
                    self._make_span_anno(qt, quote.quote, adoc.id, sdoc, span_dtos)
                    self._make_span_anno(
                        code.frame, quote.frame, adoc.id, sdoc, span_dtos
                    )
                    self._make_span_anno(
                        code.addr, quote.addressee, adoc.id, sdoc, span_dtos
                    )
                    self._make_span_anno(code.cue, quote.cue, adoc.id, sdoc, span_dtos)
                    self._make_span_anno(
                        code.speaker, quote.speaker, adoc.id, sdoc, span_dtos
                    )
                    group = SpanGroupCreateIntern(
                        name="quote", annotation_document_id=adoc.id
                    )
                    group_dtos.append(group)
                    group2annos.append((last_anno_count, len(span_dtos)))
                    last_anno_count = len(span_dtos)
            spans = crud_span_anno.create_multi(db, create_dtos=span_dtos)
            groups = crud_span_group.create_multi(db, create_dtos=group_dtos)
            links: Dict[int, List[int]] = {
                g.id: [spans[i].id for i in range(s, e)]
                for g, (s, e) in zip(groups, group2annos)
            }
            crud_span_group.link_groups_spans_batch(db, links=links)
            crud_sdoc_job_status.create_multi(
                db,
                create_dtos=[
                    SourceDocumentJobStatusCreate(
                        id=doc.id,
                        type=JobType.QUOTATION_ATTRIBUTION,
                        status=JobStatus.FINISHED,
                        timestamp=datetime.now(),
                    )
                    for doc in quote_output.documents
                ],
            )
        return num_docs

    def _make_span_anno(
        self,
        code_id: int,
        spans: List[Tuple[int, int]],
        adoc_id: int,
        sdoc: SourceDocumentDataORM,
        dtos: List[SpanAnnotationCreateIntern],
    ):
        for start, end in spans:
            char_begin = sdoc.token_starts[start]
            char_end = sdoc.token_ends[end - 1]
            dto = SpanAnnotationCreateIntern(
                project_id=sdoc.project_id,
                uuid=str(uuid4()),
                begin_token=start,
                end_token=end,
                begin=char_begin,
                end=char_end,
                span_text=sdoc.content[char_begin:char_end],
                code_id=code_id,
                annotation_document_id=adoc_id,
            )
            dtos.append(dto)

    def _get_quote_type(self, typ: str, code: _CodeQuoteId):
        match typ:
            case "Direct":
                return code.direct
            case "Indirect":
                return code.indirect
            case "Reported":
                return code.reported
            case "FreeIndirect":
                return code.frin
            case "IndirectFreeIndirect":
                return code.infr
        logger.warning(f"Could not find code for quote type {typ}, using fallback")
        return code.quote

    def _get_code_id(self, db: Session, name: str, project_id) -> int:
        db_code = crud_code.read_by_name_and_project(
            db,
            code_name=name,
            proj_id=project_id,
        )
        if db_code is None:
            raise ValueError(f"Code '{name}' not found for project {project_id}")
        return db_code.id
