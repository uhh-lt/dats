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
from repos.filesystem_repo import FilesystemRepo
from repos.llm_repo import LLMRepo
from repos.vector.weaviate_models import EmbeddingSearchResult
from repos.vector.weaviate_repo import WeaviateRepo


class PerspectivesDBService:
    def __init__(self):
        self.llm: LLMRepo = LLMRepo()
        self.weaviate: WeaviateRepo = WeaviateRepo()
        self.fsr: FilesystemRepo = FilesystemRepo()

    ### SOURCE DOCUMENT OPERATIONS ###
    def read_sdoc_by_ids(self, db: Session, ids: list[int]) -> list[SourceDocumentORM]:
        sdocs = crud_sdoc.read_by_ids(
            db=db,
            ids=ids,
        )
        return sdocs

    def read_sdoc_data_by_doctype_and_tag(
        self,
        db: Session,
        project_id: int,
        doctype: DocType,
        tag_id: int | None = None,
    ) -> list[SourceDocumentDataORM]:
        return crud_sdoc_data.read_by_doctype_and_tag(
            db=db,
            project_id=project_id,
            doctype=doctype,
            tag_id=tag_id,
        )

    ### ASPECT OPERATIONS ###

    def read_aspect(
        self,
        db: Session,
        id: int,
    ) -> AspectORM:
        aspect = crud_aspect.read(
            db=db,
            id=id,
        )
        return aspect

    def update_aspect(
        self,
        db: Session,
        id: int,
        update_dto: AspectUpdateIntern,
    ) -> AspectORM:
        updated_aspect = crud_aspect.update(
            db=db,
            id=id,
            update_dto=update_dto,
        )
        return updated_aspect

    ### DOCUMENT ASPECT OPERATIONS ###

    def create_document_aspects(
        self,
        db: Session,
        create_dtos: list[DocumentAspectCreate],
    ) -> list[DocumentAspectORM]:
        created_doument_aspects = crud_document_aspect.create_multi(
            db=db,
            create_dtos=create_dtos,
        )
        return created_doument_aspects

    def read_document_aspects_by_aspect_and_cluster(
        self, db: Session, aspect_id: int, cluster_id: int
    ) -> list[DocumentAspectORM]:
        document_aspects = crud_document_aspect.read_by_aspect_and_cluster(
            db=db,
            aspect_id=aspect_id,
            cluster_id=cluster_id,
        )
        return document_aspects

    def read_document_aspect_embeddings(
        self,
        client: WeaviateClient,
        project_id: int,
        aspect_object_identifiers: list[AspectObjectIdentifier],
    ) -> list[list[float]]:
        embeddings = crud_aspect_embedding.get_embeddings(
            client=client,
            project_id=project_id,
            ids=aspect_object_identifiers,
        )
        return embeddings

    def update_document_aspects(
        self,
        db: Session,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentAspectUpdate],
    ) -> list[DocumentAspectORM]:
        updated_document_aspects = crud_document_aspect.update_multi(
            db=db,
            ids=ids,
            update_dtos=update_dtos,
        )
        return updated_document_aspects

    def store_document_aspect_embeddings(
        self,
        client: WeaviateClient,
        project_id: int,
        aspect_object_identifiers: list[AspectObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        crud_aspect_embedding.add_embedding_batch(
            client=client,
            project_id=project_id,
            ids=aspect_object_identifiers,
            embeddings=embeddings,
        )

    ### CLUSTER OPERATIONS ###

    def read_cluster(self, db: Session, id: int) -> ClusterORM:
        cluster = crud_cluster.read(db=db, id=id)
        return cluster

    def read_or_create_outlier_cluster(
        self, db, *, aspect_id: int, level: int
    ) -> ClusterORM:
        return crud_cluster.read_or_create_outlier_cluster(
            db=db, aspect_id=aspect_id, level=level
        )

    def read_cluster_embeddings_by_aspect(
        self, client: WeaviateClient, project_id: int, aspect_id: int
    ) -> list[EmbeddingSearchResult[ClusterObjectIdentifier]]:
        cluster_embeddings = crud_cluster_embedding.find_embeddings_by_aspect_id(
            client=client,
            project_id=project_id,
            aspect_id=aspect_id,
        )
        return cluster_embeddings

    def create_clusters(
        self,
        db: Session,
        create_dtos: list[ClusterCreateIntern],
        manual_commit: bool = False,
    ) -> list[ClusterORM]:
        created_clusters = crud_cluster.create_multi(
            db=db,
            create_dtos=create_dtos,
            manual_commit=manual_commit,
        )
        return created_clusters

    def update_clusters(
        self,
        db: Session,
        ids: list[int],
        update_dtos: list[ClusterUpdateIntern],
        manual_commit: bool = False,
    ) -> list[ClusterORM]:
        updated_clusters = crud_cluster.update_multi(
            db=db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=manual_commit,
        )
        return updated_clusters

    def delete_cluster(
        self,
        db: Session,
        client: WeaviateClient,
        cluster_id: int,
        manual_commit: bool = False,
    ) -> ClusterORM:
        cluster = crud_cluster.read(db=db, id=cluster_id)
        project_id = cluster.aspect.project_id
        aspect_id = cluster.aspect_id

        # 1. Delete the cluster from the SQL database
        deleted_cluster = crud_cluster.delete(
            db=db,
            id=cluster_id,
            manual_commit=manual_commit,
        )

        # 2. Delete the cluster embedding from Weaviate
        crud_cluster_embedding.remove_embedding(
            client=client,
            project_id=project_id,
            id=ClusterObjectIdentifier(aspect_id=aspect_id, cluster_id=cluster_id),
        )

        return deleted_cluster

    def store_cluster_embeddings(
        self,
        client: WeaviateClient,
        project_id: int,
        ids: list[ClusterObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        crud_cluster_embedding.add_embedding_batch(
            client=client,
            project_id=project_id,
            ids=ids,
            embeddings=embeddings,
        )

    ### DOCUMENT CLUSTER OPERATIONS ###

    def create_document_clusters(
        self,
        db: Session,
        create_dtos: list[DocumentClusterCreate],
        manual_commit: bool = False,
    ) -> list[DocumentClusterORM]:
        created_document_clusters = crud_document_cluster.create_multi(
            db=db,
            create_dtos=create_dtos,
            manual_commit=manual_commit,
        )
        return created_document_clusters

    def read_document_clusters_by_cluster(
        self, db: Session, cluster_id: int
    ) -> list[DocumentClusterORM]:
        document_clusters = crud_document_cluster.read_by_cluster(
            db=db,
            cluster_id=cluster_id,
        )
        return document_clusters

    def read_document_clusters_by_aspect(
        self, db: Session, aspect_id: int
    ) -> list[DocumentClusterORM]:
        document_clusters = crud_document_cluster.read_by_aspect_id(
            db=db,
            aspect_id=aspect_id,
        )
        return document_clusters

    def update_document_clusters(
        self,
        db: Session,
        *,
        ids: list[tuple[int, int]],
        update_dtos: list[DocumentClusterUpdate],
    ) -> list[DocumentClusterORM]:
        updated_document_clusters = crud_document_cluster.update_multi(
            db=db,
            ids=ids,
            update_dtos=update_dtos,
        )
        return updated_document_clusters
