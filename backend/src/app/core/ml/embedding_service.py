from datetime import datetime
from typing import List

import numpy as np
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_job_status import crud_sdoc_job_status
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_job_status import SourceDocumentJobStatusCreate
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_job_status import (
    JobStatus,
    JobType,
    SourceDocumentJobStatusORM,
)
from app.core.data.repo.utils import image_to_base64, load_image
from app.core.db.index_type import IndexType
from app.core.db.sql_service import SQLService
from app.core.db.vector_index_service import VectorIndexService
from app.core.db.weaviate_service import WeaviateVectorLengthError
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.util.singleton_meta import SingletonMeta
from loguru import logger
from sqlalchemy import ColumnElement, and_


class EmbeddingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.rms: RayModelService = RayModelService()
        cls.llm: OllamaService = OllamaService()
        cls._index: VectorIndexService = VectorIndexService()
        return super(EmbeddingService, cls).__new__(cls)

    def add_text_sdoc_to_index(
        self,
        proj_id: int,
        sdoc_id: int,
        sentences: List[str],
        text: str,
    ) -> None:
        sentence_embs = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        if len(sentence_embs.embeddings) != len(sentences):
            raise ValueError(
                f"Embedding/Sentence mismatch for sdoc {sdoc_id}! Input: {len(sentences)} sentences, Output: {len(sentence_embs.embeddings)} embeddings"
            )
        sentence_embs = sentence_embs.numpy()

        logger.debug(
            f"Adding {len(sentence_embs)} sentences "
            f"from SDoc {sdoc_id} in project {proj_id} to index ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.SENTENCE,
            proj_id,
            [sdoc_id] * len(sentence_embs),
            sentence_embs,
        )

    def _index_document_embeddings(
        self,
        proj_id: int,
        sdoc_ids: List[int],
        embeddings: np.ndarray,
        force: bool = False,
    ):
        try:
            self._index.add_embeddings_to_index(
                IndexType.DOCUMENT, proj_id, sdoc_ids, embeddings
            )
        except WeaviateVectorLengthError as e:
            if force:
                self._index.remove_project_index(proj_id, IndexType.DOCUMENT)
                self._index.add_embeddings_to_index(
                    IndexType.DOCUMENT, proj_id, sdoc_ids, embeddings
                )
            else:
                raise e

    def add_image_sdoc_to_index(self, proj_id: int, sdoc_id: int) -> None:
        image_emb = self.encode_image(image_sdoc_id=sdoc_id)
        logger.debug(
            f"Adding image SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.IMAGE, proj_id, [sdoc_id], [image_emb]
        )

    def remove_sdoc_embeddings(self, doctype: str, sdoc_id: int):
        match doctype:
            case DocType.text:
                logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
                self._index.remove_embeddings_from_index(IndexType.SENTENCE, sdoc_id)
                self._index.remove_embeddings_from_index(IndexType.DOCUMENT, sdoc_id)
            case DocType.image:
                logger.debug(f"Removing image SDoc {sdoc_id} from Index!")
                self._index.remove_embeddings_from_index(IndexType.IMAGE, sdoc_id)
            case _:
                # Other doctypes are not used for simsearch
                pass

    def encode_document(self, text: str) -> np.ndarray:
        doc_emb = self.llm.llm_embed([text])
        return doc_emb

    def encode_sentences(self, sentences: List[str]) -> np.ndarray:
        encoded_query = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        if len(encoded_query.embeddings) == 1:
            return encoded_query.numpy().squeeze()
        else:
            return encoded_query.numpy()

    def encode_image(self, image_sdoc_id: int) -> np.ndarray:
        image_sdoc = self._get_image_name_from_sdoc_id(sdoc_id=image_sdoc_id)
        image_fp = self.repo.get_path_to_sdoc_file(image_sdoc, raise_if_not_exists=True)
        image = load_image(image_fp)
        base64_image = image_to_base64(image)

        encoded_query = self.rms.clip_image_embedding(
            ClipImageEmbeddingInput(
                base64_images=[base64_image],
            )
        )
        return encoded_query.numpy().squeeze()

    def _get_image_name_from_sdoc_id(self, sdoc_id: int) -> SourceDocumentRead:
        with self.sqls.db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert sdoc.doctype == DocType.image, (
                f"SourceDocument with {sdoc_id=} is not an image!"
            )
        return sdoc

    def embed_documents(
        self, project_id: int, filter_criterion: ColumnElement, recompute=False
    ) -> int:
        total_processed = 0
        num_processed = -1
        if recompute:
            self.sim.remove_all_document_embeddings(project_id)
        while num_processed != 0:
            num_processed = self._process_document_batch(
                filter_criterion,
                project_id,
                force_override=(recompute and (total_processed == 0)),
            )
            total_processed = +num_processed
        return total_processed

    def _process_document_batch(
        self,
        filter_criterion: ColumnElement,
        project_id: int,
        batch_size=8,
        force_override=False,
    ):
        with self.sqls.db_session() as db:
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
        content = [doc.content for doc in sdoc_data if doc is not None]
        sdoc_ids = [doc.id for doc in sdoc_data if doc is not None]
        num_docs = len(content)

        if num_docs == 0:
            return num_docs

        embeddings = self.llm.llm_embed(content)

        self._index_document_embeddings(
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
