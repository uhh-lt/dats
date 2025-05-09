from datetime import datetime

from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document_job_status import crud_sdoc_job_status
from app.core.data.dto.source_document_job_status import SourceDocumentJobStatusCreate
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_job_status import (
    JobStatus,
    JobType,
    SourceDocumentJobStatusORM,
)
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.db.simsearch_service import SimSearchService
from app.core.db.sql_service import SQLService
from app.preprocessing.ray_model_service import RayModelService
from app.util.singleton_meta import SingletonMeta
from sqlalchemy import ColumnElement, and_


class EmbeddingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()
        cls.llm: OllamaService = OllamaService()
        cls.sim: SimSearchService = SimSearchService()
        return super(EmbeddingService, cls).__new__(cls)

    def embed_documents(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        total_processed = 0
        num_processed = -1
        if recompute:
            self.sim.remove_all_document_embeddings(project_id)
        while num_processed != 0:
            num_processed = self._process_batch(
                filter_criterion,
                project_id,
                force_override=(recompute and (total_processed == 0)),
            )
            total_processed = +num_processed
        return total_processed

    def _process_batch(
        self,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=8,
        force_override=False,
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
                        SourceDocumentJobStatusORM.type == JobType.DOCUMENT_EMBEDDING,
                    ),
                    full=True,
                )
                .filter(filter_criterion)
                .limit(batch_size)
            )
            sdoc_data = query.all()
        content = [doc.content for doc in sdoc_data if doc is not None]
        sdoc_ids = [doc.id for doc in sdoc_data if doc is not None]
        num_docs = len(content)

        if num_docs == 0:
            return num_docs

        embeddings = self.llm.llm_embed(content)

        self.sim.add_document_embeddings(
            project_id, sdoc_ids, embeddings, force=force_override
        )
        crud_sdoc_job_status.create_multi(
            db,
            create_dtos=[
                SourceDocumentJobStatusCreate(
                    id=id,
                    type=JobType.DOCUMENT_EMBEDDING,
                    status=JobStatus.FINISHED,
                    timestamp=datetime.now(),
                )
                for id in sdoc_ids
            ],
        )
        return num_docs
