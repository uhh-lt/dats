from typing import Callable

from loguru import logger
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from common.doc_type import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import AspectUpdateIntern
from modules.perspectives.aspect_embedding_crud import crud_aspect_embedding
from modules.perspectives.aspect_embedding_dto import AspectObjectIdentifier
from modules.perspectives.aspect_orm import AspectORM
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.cluster_dto import ClusterCreateIntern, ClusterUpdateIntern
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.perspectives.document_aspect_dto import (
    DocumentAspectCreate,
    DocumentAspectUpdate,
)
from modules.perspectives.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster_crud import crud_document_cluster
from modules.perspectives.document_cluster_dto import (
    DocumentClusterCreate,
    DocumentClusterUpdate,
)
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from repos.vector.weaviate_models import EmbeddingSearchResult


class PerspectivesDBTransaction:
    def __init__(self, db: Session, client: WeaviateClient):
        self.db = db
        self.client = client
        self.undo_stack: list[tuple[Callable, tuple, dict]] = []
        self._committed = False

    def register_undo(self, func: Callable, *args, **kwargs):
        """Registers an undo operation to be executed on rollback."""
        self.undo_stack.append((func, args, kwargs))

    def commit(self):
        """Commits the SQL transaction and clears the undo stack."""
        if self._committed:
            logger.warning("Transaction already committed.")
            return

        self.db.commit()
        self._committed = True
        self.undo_stack.clear()

    def rollback(self):
        """Rolls back the SQL transaction and executes undo operations for external systems."""
        if self._committed:
            logger.warning("Attempted rollback after commit.")
            return

        # 1. Rollback SQL
        self.db.rollback()
        logger.info("Rolled back SQL transaction.")

        # 2. Undo external changes (LIFO)
        while self.undo_stack:
            func, args, kwargs = self.undo_stack.pop()
            try:
                func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Failed to undo action {func.__name__}: {e}")

    ### SOURCE DOCUMENT OPERATIONS ###
    def read_sdoc_by_ids(self, ids: list[int]) -> list[SourceDocumentORM]:
        sdocs = crud_sdoc.read_by_ids(
            db=self.db,
            ids=ids,
        )
        return sdocs

    def read_sdoc_data_by_doctype_and_tag(
        self,
        project_id: int,
        doctype: DocType,
        tag_id: int | None = None,
    ) -> list[SourceDocumentDataORM]:
        return crud_sdoc_data.read_by_doctype_and_tag(
            db=self.db,
            project_id=project_id,
            doctype=doctype,
            tag_id=tag_id,
        )

    ### ASPECT OPERATIONS ###

    def read_aspect(
        self,
        id: int,
    ) -> AspectORM:
        aspect = crud_aspect.read(
            db=self.db,
            id=id,
        )
        return aspect

    def update_aspect(
        self,
        id: int,
        update_dto: AspectUpdateIntern,
    ) -> AspectORM:
        updated_aspect = crud_aspect.update(
            db=self.db, id=id, update_dto=update_dto, manual_commit=True
        )
        return updated_aspect

    ### DOCUMENT ASPECT OPERATIONS ###

    def create_document_aspects(
        self,
        create_dtos: list[DocumentAspectCreate],
    ) -> list[DocumentAspectORM]:
        created_doument_aspects = crud_document_aspect.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )
        return created_doument_aspects

    def read_document_aspects_by_aspect_and_cluster(
        self, aspect_id: int, cluster_id: int
    ) -> list[DocumentAspectORM]:
        document_aspects = crud_document_aspect.read_by_aspect_and_cluster(
            db=self.db,
            aspect_id=aspect_id,
            cluster_id=cluster_id,
        )
        return document_aspects

    def read_document_aspect_embeddings(
        self,
        project_id: int,
        aspect_object_identifiers: list[AspectObjectIdentifier],
    ) -> list[list[float]]:
        embeddings = crud_aspect_embedding.get_embeddings(
            client=self.client,
            project_id=project_id,
            ids=aspect_object_identifiers,
        )
        return embeddings

    def update_document_aspects(
        self,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentAspectUpdate],
    ) -> list[DocumentAspectORM]:
        updated_document_aspects = crud_document_aspect.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )
        return updated_document_aspects

    def store_document_aspect_embeddings(
        self,
        project_id: int,
        aspect_object_identifiers: list[AspectObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        crud_aspect_embedding.add_embedding_batch(
            client=self.client,
            project_id=project_id,
            ids=aspect_object_identifiers,
            embeddings=embeddings,
        )

    ### CLUSTER OPERATIONS ###

    def read_cluster(self, id: int) -> ClusterORM:
        cluster = crud_cluster.read(db=self.db, id=id)
        return cluster

    def read_or_create_outlier_cluster(self, aspect_id: int) -> ClusterORM:
        return crud_cluster.read_or_create_outlier_cluster(
            db=self.db, aspect_id=aspect_id, manual_commit=True
        )

    def read_cluster_embeddings_by_aspect(
        self, project_id: int, aspect_id: int
    ) -> list[EmbeddingSearchResult[ClusterObjectIdentifier]]:
        cluster_embeddings = crud_cluster_embedding.find_embeddings_by_aspect_id(
            client=self.client,
            project_id=project_id,
            aspect_id=aspect_id,
        )
        return cluster_embeddings

    def create_clusters(
        self,
        create_dtos: list[ClusterCreateIntern],
    ) -> list[ClusterORM]:
        created_clusters = crud_cluster.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )
        return created_clusters

    def update_clusters(
        self,
        ids: list[int],
        update_dtos: list[ClusterUpdateIntern],
    ) -> list[ClusterORM]:
        updated_clusters = crud_cluster.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )
        return updated_clusters

    def delete_cluster(
        self,
        cluster_id: int,
    ) -> ClusterORM:
        cluster = crud_cluster.read(db=self.db, id=cluster_id)
        project_id = cluster.aspect.project_id
        aspect_id = cluster.aspect_id

        # 1. Delete the cluster from the SQL database
        deleted_cluster = crud_cluster.delete(
            db=self.db,
            id=cluster_id,
            manual_commit=True,
        )

        # 2. Delete the cluster embedding from Weaviate
        crud_cluster_embedding.remove_embedding(
            client=self.client,
            project_id=project_id,
            id=ClusterObjectIdentifier(aspect_id=aspect_id, cluster_id=cluster_id),
        )

        return deleted_cluster

    def store_cluster_embeddings(
        self,
        project_id: int,
        ids: list[ClusterObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        crud_cluster_embedding.add_embedding_batch(
            client=self.client,
            project_id=project_id,
            ids=ids,
            embeddings=embeddings,
        )

    ### DOCUMENT CLUSTER OPERATIONS ###

    def create_document_clusters(
        self,
        create_dtos: list[DocumentClusterCreate],
    ) -> list[DocumentClusterORM]:
        created_document_clusters = crud_document_cluster.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )
        return created_document_clusters

    def read_document_clusters_by_cluster(
        self, cluster_id: int
    ) -> list[DocumentClusterORM]:
        document_clusters = crud_document_cluster.read_by_cluster(
            db=self.db,
            cluster_id=cluster_id,
        )
        return document_clusters

    def read_document_clusters_by_aspect(
        self, aspect_id: int
    ) -> list[DocumentClusterORM]:
        document_clusters = crud_document_cluster.read_by_aspect_id(
            db=self.db,
            aspect_id=aspect_id,
        )
        return document_clusters

    def update_document_clusters(
        self,
        *,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentClusterUpdate],
    ) -> list[DocumentClusterORM]:
        updated_document_clusters = crud_document_cluster.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )
        return updated_document_clusters
