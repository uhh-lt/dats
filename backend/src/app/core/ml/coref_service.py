from datetime import datetime
from typing import Dict, List, Tuple

from sqlalchemy import ColumnElement
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.source_document_job_status import crud_sdoc_job_status
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.source_document_job_status import SourceDocumentJobStatusCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreateIntern
from app.core.data.dto.span_group import SpanGroupCreateIntern
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
from app.preprocessing.ray_model_worker.dto.coref import CorefInputDoc, CorefJobInput
from app.util.singleton_meta import SingletonMeta


class CorefService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()
        return super(CorefService, cls).__new__(cls)

    def perform_coreference_resolution(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        with self.sqls.db_session() as db:
            mention_code = self._get_code_id(db, "MENTION", project_id)
            language_metadata = (
                crud_project_meta.read_by_project_and_key_and_metatype_and_doctype(
                    db, project_id, "language", "STRING", "text"
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
                mention_code,
                language_metadata.id,
                recompute,
            )
            total_processed = +num_processed
        return total_processed

    def _process_batch(
        self,
        filter_criterion: ColumnElement,
        project_id: int,
        code: int,
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
                    SourceDocumentJobStatusORM.id == SourceDocumentDataORM.id,
                    full=True,
                )
                .filter(filter_criterion)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id
                    == language_metadata_id,
                    # workaround for buggy langdetect, set to 'de' once fixed
                    SourceDocumentMetadataORM.str_value.in_(("en", "de")),
                )
                .limit(100)
            )
            sdoc_data = query.all()
        num_docs = len(sdoc_data)

        if num_docs == 0:
            return num_docs

        coref_input = CorefJobInput(
            id=1,
            language="de",
            project_id=project_id,
            documents=[
                CorefInputDoc(
                    id=sd.id,
                    tokens=sd.tokenized_sentences,
                )
                for sd in sdoc_data
            ],
        )

        sdoc_by_id = {sdoc.id: sdoc for sdoc in sdoc_data}

        coref_output = self.rms.coref_prediction(coref_input)

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
                        SpanAnnotationORM.code_id == code,
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
            for doc in coref_output.documents:
                adoc = crud_adoc.exists_or_create(
                    db, user_id=SYSTEM_USER_ID, sdoc_id=doc.id
                )
                sdoc = sdoc_by_id[doc.id]
                for coref in doc.clusters:
                    for start, end in coref:
                        begin_char = sdoc.token_character_offsets[start][0]
                        end_char = sdoc.token_character_offsets[end][1]
                        dto = SpanAnnotationCreateIntern(
                            begin_token=start,
                            end_token=end + 1,
                            begin=begin_char,
                            end=end_char,
                            span_text=sdoc.content[begin_char:end_char],
                            code_id=code,
                            annotation_document_id=adoc.id,
                        )
                        span_dtos.append(dto)
                    group = SpanGroupCreateIntern(
                        name="coref", annotation_document_id=adoc.id
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
                        type=JobType.COREFERENCE_RESOLUTION,
                        status=JobStatus.FINISHED,
                        timestamp=datetime.now(),
                    )
                    for doc in coref_output.documents
                ],
            )
        return num_docs

    def _get_code_id(self, db: Session, name: str, project_id) -> int:
        db_code = crud_code.read_by_name_and_project(
            db,
            code_name=name,
            proj_id=project_id,
        )
        if db_code is None:
            raise ValueError(f"Code '{name}' not found for project {project_id}")
        return db_code.id
