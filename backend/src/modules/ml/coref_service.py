from datetime import datetime
from uuid import uuid4

from sqlalchemy import ColumnElement, and_
from sqlalchemy.orm import Session

from common.doc_type import DocType
from common.meta_type import MetaType
from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_dto import SpanGroupCreateIntern
from core.code.code_crud import crud_code
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.user.user_crud import SYSTEM_USER_ID
from modules.ml.source_document_job_status_crud import crud_sdoc_job_status
from modules.ml.source_document_job_status_dto import SourceDocumentJobStatusCreate
from modules.ml.source_document_job_status_orm import (
    JobStatus,
    JobType,
    SourceDocumentJobStatusORM,
)
from ray_model_worker.dto.coref import CorefInputDoc, CorefJobInput
from repos.ray_repo import RayRepo


class CorefService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.ray: RayRepo = RayRepo()
        return super(CorefService, cls).__new__(cls)

    def perform_coreference_resolution(
        self,
        db: Session,
        project_id: int,
        filter_criterion: ColumnElement,
        recompute=False,
    ) -> int:
        mention_code = self._get_code_id(db, "MENTION", project_id)
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
                db,
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
        db: Session,
        filter_criterion: ColumnElement,
        project_id: int,
        code: int,
        language_metadata_id: int,
        recompute: bool = False,
    ):
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
                    SourceDocumentJobStatusORM.type == JobType.COREFERENCE_RESOLUTION,
                ),
                full=True,
            )
            .filter(filter_criterion)
            .filter(
                SourceDocumentMetadataORM.project_metadata_id == language_metadata_id,
                SourceDocumentMetadataORM.str_value == "de",
            )
            .limit(100)
        )
        sdoc_data = query.all()
        sdoc_data = [doc for doc in sdoc_data if doc is not None]
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

        coref_output = self.ray.coref_prediction(coref_input)

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

        span_dtos: list[SpanAnnotationCreateIntern] = []
        group_dtos: list[SpanGroupCreateIntern] = []
        group2annos: list[tuple[int, int]] = []
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
                        project_id=project_id,
                        uuid=str(uuid4()),
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
        links: dict[int, list[int]] = {
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
