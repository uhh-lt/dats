from datetime import datetime
from typing import List

import numpy as np
from common.doc_type import DocType
from common.singleton_meta import SingletonMeta
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_dto import SourceDocumentRead
from modules.ml.source_document_job_status_crud import crud_sdoc_job_status
from modules.ml.source_document_job_status_dto import SourceDocumentJobStatusCreate
from modules.ml.source_document_job_status_orm import (
    JobStatus,
    JobType,
    SourceDocumentJobStatusORM,
)
from ray_model_worker.dto.clip import ClipImageEmbeddingInput, ClipTextEmbeddingInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import RepoService
from repos.ollama_repo import OllamaService
from repos.ray_repo import RayModelService
from repos.vector.weaviate_repo import WeaviateRepo
from sqlalchemy import ColumnElement, and_
from util.image_utils import image_to_base64, load_image
from weaviate import WeaviateClient


class EmbeddingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqlr: SQLRepo = SQLRepo()
        cls.repo = RepoService()
        cls.rms: RayModelService = RayModelService()
        cls.llm: OllamaService = OllamaService()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(EmbeddingService, cls).__new__(cls)

    def encode_document(self, text: str) -> np.ndarray:
        return self.llm.llm_embed([text])

    def encode_sentences(self, sentences: List[str]) -> np.ndarray:
        encoded_query = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        return encoded_query.numpy()

    def encode_image(self, sdoc_id: int) -> np.ndarray:
        with self.sqlr.db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert (
                sdoc.doctype == DocType.image
            ), f"SourceDocument with {sdoc_id=} is not an image!"

        image_fp = self.repo.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)
        image = load_image(image_fp)
        base64_image = image_to_base64(image)

        encoded_query = self.rms.clip_image_embedding(
            ClipImageEmbeddingInput(
                base64_images=[base64_image],
            )
        )
        return encoded_query.numpy().squeeze()

    def embed_sentences(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        total_processed = 0
        num_processed = -1

        with self.weaviate.weaviate_session() as client:
            if recompute:
                crud_sentence_embedding.remove_embeddings_by_project(client, project_id)

            while num_processed != 0:
                num_processed = self._process_sentences_batch(
                    client,
                    filter_criterion,
                    project_id,
                )
                total_processed += num_processed
            return total_processed

    def _process_sentences_batch(
        self,
        client: WeaviateClient,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=16,
    ):
        with self.sqlr.db_session() as db:
            query = (
                db.query(SourceDocumentDataORM)
                .outerjoin(
                    SourceDocumentJobStatusORM,
                    and_(
                        SourceDocumentJobStatusORM.id == SourceDocumentDataORM.id,
                        SourceDocumentJobStatusORM.type == JobType.SENTENCE_EMBEDDING,
                    ),
                    full=True,
                )
                .filter(filter_criterion)
                .limit(batch_size)
            )
            sdoc_data = query.all()
        doc_sentences = [doc.sentences for doc in sdoc_data]
        sdoc_ids = [doc.id for doc in sdoc_data]
        num_docs = len(doc_sentences)

        if num_docs == 0:
            return num_docs

        # Embed the sentences for a batch of documents
        embeddings = self.encode_sentences(
            [s for sents in doc_sentences for s in sents]
        ).tolist()

        ids = [
            SentenceObjectIdentifier(sdoc_id=sdoc_id, sentence_id=i)
            for sdoc_id, sents in zip(sdoc_ids, doc_sentences)
            for i in range(len(sents))
        ]

        # Store the embeddings of a batch of documents
        crud_sentence_embedding.add_embedding_batch(
            client,
            project_id,
            ids=ids,
            embeddings=embeddings,
        )

        crud_sdoc_job_status.create_multi(
            db,
            create_dtos=[
                SourceDocumentJobStatusCreate(
                    id=id,
                    type=JobType.SENTENCE_EMBEDDING,
                    status=JobStatus.FINISHED,
                    timestamp=datetime.now(),
                )
                for id in sdoc_ids
            ],
        )
        return num_docs

    def embed_documents(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        total_processed = 0
        num_processed = -1

        with self.weaviate.weaviate_session() as client:
            if recompute:
                crud_document_embedding.remove_embeddings_by_project(
                    client=client, project_id=project_id
                )

            while num_processed != 0:
                num_processed = self._process_document_batch(
                    client,
                    filter_criterion,
                    project_id,
                    force_override=(recompute and (total_processed == 0)),
                )
                total_processed += num_processed
            return total_processed

    def _process_document_batch(
        self,
        client: WeaviateClient,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=8,
        force_override=False,
    ):
        with self.sqlr.db_session() as db:
            query = (
                db.query(SourceDocumentDataORM)
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
        content = [doc.content for doc in sdoc_data]
        sdoc_ids = [doc.id for doc in sdoc_data]
        num_docs = len(content)

        if num_docs == 0:
            return num_docs

        # Embed the documents
        embeddings = self.llm.llm_embed(content).tolist()

        # Store the embeddings
        crud_document_embedding.add_embedding_batch(
            client=client,
            project_id=project_id,
            ids=[DocumentObjectIdentifier(sdoc_id=sdoc_id) for sdoc_id in sdoc_ids],
            embeddings=embeddings,
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
