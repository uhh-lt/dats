from datetime import datetime

import numpy as np
from sqlalchemy import ColumnElement, and_
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

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
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.llm_repo import LLMRepo
from repos.ray.dto.clip import ClipImageEmbeddingInput, ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from utils.image_utils import image_to_base64, load_image


class EmbeddingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr = FilesystemRepo()
        cls.ray: RayRepo = RayRepo()
        cls.llm: LLMRepo = LLMRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(EmbeddingService, cls).__new__(cls)

    def encode_document(self, text: str) -> np.ndarray:
        return self.llm.llm_embed([text])

    def encode_sentences(self, sentences: list[str]) -> np.ndarray:
        encoded_query = self.ray.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        return encoded_query.numpy()

    def encode_image(self, sdoc_id: int) -> np.ndarray:
        with SQLRepo().db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert sdoc.doctype == DocType.image, (
                f"SourceDocument with {sdoc_id=} is not an image!"
            )

        image_fp = self.fsr.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)
        image = load_image(image_fp)
        base64_image = image_to_base64(image)

        encoded_query = self.ray.clip_image_embedding(
            ClipImageEmbeddingInput(
                base64_images=[base64_image],
            )
        )
        return encoded_query.numpy().squeeze()

    def embed_sentences(
        self,
        db: Session,
        project_id: int,
        filter_criterion: ColumnElement,
        recompute=False,
    ) -> int:
        total_processed = 0
        num_processed = -1

        with self.weaviate.weaviate_session() as client:
            if recompute:
                crud_sentence_embedding.remove_embeddings_by_project(client, project_id)

            while num_processed != 0:
                num_processed = self._process_sentences_batch(
                    db,
                    client,
                    filter_criterion,
                    project_id,
                )
                total_processed += num_processed
            return total_processed

    def _process_sentences_batch(
        self,
        db: Session,
        client: WeaviateClient,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=16,
    ):
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
        self,
        db: Session,
        project_id: int,
        filter_criterion: ColumnElement,
        recompute=False,
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
                    db,
                    client,
                    filter_criterion,
                    project_id,
                    force_override=(recompute and (total_processed == 0)),
                )
                total_processed += num_processed
            return total_processed

    def _process_document_batch(
        self,
        db: Session,
        client: WeaviateClient,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=8,
        force_override=False,
    ):
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
