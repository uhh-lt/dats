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
from modules.perspectives.perspectives_history import (
    PerspectiveDBActions,
    PerspectivesHistory,
)
from modules.perspectives.perspectives_job_dto import PerspectivesJobType
from repos.vector.weaviate_exceptions import WeaviateObjectIDNotFoundException
from repos.vector.weaviate_models import EmbeddingSearchResult


class PerspectivesDBTransaction:
    def __init__(
        self,
        db: Session,
        client: WeaviateClient,
        aspect_id: int,
        perspective_action: PerspectivesJobType,
        write_history: bool = True,
    ):
        self.db = db
        self.client = client
        self.history = None
        if write_history:
            self.history = PerspectivesHistory(
                db=db, aspect_id=aspect_id, perspective_action=perspective_action
            )
        self._committed = False
        self.aspect_id = aspect_id
        self.perspective_action = perspective_action

    def commit(self):
        """Commits the SQL transaction and stores the action history."""
        if self._committed:
            logger.warning("Transaction already committed.")
            return

        if self.history:
            self.history.store_history()
        self.db.commit()
        self._committed = True

    def rollback(self):
        """Rolls back the SQL transaction and executes undo operations for external systems."""
        if self._committed:
            logger.warning("Attempted rollback after commit.")
            return

        # # 1. Rollback SQL
        # self.db.rollback()
        # logger.info("Rolled back SQL transaction.")

        # # 2. Undo external changes (LIFO)
        # while self.undo_stack:
        #     func, args, kwargs = self.undo_stack.pop()
        #     try:
        #         func(*args, **kwargs)
        #     except Exception as e:
        #         logger.error(f"Failed to undo action {func.__name__}: {e}")

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
        # 1. store previous state for undo
        if self.history:
            previous_aspect = self.read_aspect(id=id)
            undo_update_dto_fields = {}
            for updated_field in update_dto.model_dump(exclude_unset=True).keys():
                undo_update_dto_fields[updated_field] = getattr(
                    previous_aspect, updated_field
                )
            self.history.register_undo(
                action=PerspectiveDBActions.UPDATE_ASPECT,
                params={
                    "id": id,
                    "update_dto": AspectUpdateIntern(**undo_update_dto_fields),
                },
            )

        # 2. perform update
        updated_aspect = crud_aspect.update(
            db=self.db, id=id, update_dto=update_dto, manual_commit=True
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.UPDATE_ASPECT,
                params={
                    "id": id,
                    "update_dto": update_dto,
                },
            )

        return updated_aspect

    ### DOCUMENT ASPECT OPERATIONS ###

    def create_document_aspects(
        self,
        create_dtos: list[DocumentAspectCreate],
    ) -> list[DocumentAspectORM]:
        # 1. create document aspects
        created_doument_aspects = crud_document_aspect.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )

        if self.history:
            # 2. register undo
            self.history.register_undo(
                action=PerspectiveDBActions.DELETE_DOCUMENT_ASPECTS,
                params={
                    "ids": [
                        (da.aspect_id, da.sdoc_id) for da in created_doument_aspects
                    ],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.CREATE_DOCUMENT_ASPECTS,
                params={
                    "orms": [da.as_dict() for da in created_doument_aspects],
                },
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
        # 1. store previous state for undo
        if self.history:
            previous_document_aspects = crud_document_aspect.read_by_ids(
                db=self.db,
                ids=ids,
            )
            undo_update_dtos: list[DocumentAspectUpdate] = []
            for update_dto, previous_document_aspects in zip(
                update_dtos, previous_document_aspects
            ):
                undo_update_dto_fields = {}
                for updated_field in update_dto.model_dump(exclude_unset=True).keys():
                    undo_update_dto_fields[updated_field] = getattr(
                        previous_document_aspects, updated_field
                    )
                undo_update_dtos.append(DocumentAspectUpdate(**undo_update_dto_fields))
            self.history.register_undo(
                action=PerspectiveDBActions.UPDATE_DOCUMENT_ASPECTS,
                params={
                    "ids": ids,
                    "update_dtos": undo_update_dtos,
                },
            )

        # 2. perform update
        updated_document_aspects = crud_document_aspect.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.UPDATE_DOCUMENT_ASPECTS,
                params={
                    "ids": ids,
                    "update_dtos": update_dtos,
                },
            )

        return updated_document_aspects

    def delete_document_aspects(
        self,
        ids: list[tuple[int, int]],
    ) -> list[DocumentAspectORM]:
        # 1. delete document aspects
        deleted_document_aspects = crud_document_aspect.delete_multi(
            db=self.db,
            ids=ids,
            manual_commit=True,
        )

        if self.history:
            # 2. store old state for undo
            self.history.register_undo(
                action=PerspectiveDBActions.CREATE_DOCUMENT_ASPECTS,
                params={
                    "orms": [da.as_dict() for da in deleted_document_aspects],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.DELETE_DOCUMENT_ASPECTS,
                params={
                    "ids": ids,
                },
            )

        return deleted_document_aspects

    def store_document_aspect_embeddings(
        self,
        project_id: int,
        ids: list[AspectObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        # 1. register undo
        if self.history:
            try:
                previous_embeddings = crud_aspect_embedding.get_embeddings(
                    client=self.client,
                    project_id=project_id,
                    ids=ids,
                )
            except WeaviateObjectIDNotFoundException:
                previous_embeddings = None
            if previous_embeddings:
                self.history.register_undo(
                    action=PerspectiveDBActions.STORE_DOCUMENT_ASPECT_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                        "embeddings": previous_embeddings,
                    },
                )
            else:
                self.history.register_undo(
                    action=PerspectiveDBActions.REMOVE_DOCUMENT_ASPECT_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                    },
                )

        # 2. store new embeddings
        crud_aspect_embedding.add_embedding_batch(
            client=self.client,
            project_id=project_id,
            ids=ids,
            embeddings=embeddings,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.STORE_DOCUMENT_ASPECT_EMBEDDINGS,
                params={
                    "project_id": project_id,
                    "ids": ids,
                    "embeddings": embeddings,
                },
            )

    def remove_document_aspect_embeddings(
        self,
        project_id: int,
        ids: list[AspectObjectIdentifier],
    ) -> None:
        # 1. register undo
        if self.history:
            try:
                previous_embeddings = crud_aspect_embedding.get_embeddings(
                    client=self.client,
                    project_id=project_id,
                    ids=ids,
                )
            except WeaviateObjectIDNotFoundException:
                previous_embeddings = None
            if previous_embeddings:
                self.history.register_undo(
                    action=PerspectiveDBActions.STORE_DOCUMENT_ASPECT_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                        "embeddings": previous_embeddings,
                    },
                )
            else:
                self.history.register_undo(
                    action=PerspectiveDBActions.REMOVE_DOCUMENT_ASPECT_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                    },
                )

        # 2. remove embeddings
        crud_aspect_embedding.remove_embeddings(
            client=self.client,
            project_id=project_id,
            ids=ids,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.REMOVE_DOCUMENT_ASPECT_EMBEDDINGS,
                params={
                    "project_id": project_id,
                    "ids": ids,
                },
            )

    ### CLUSTER OPERATIONS ###

    def read_cluster(self, id: int) -> ClusterORM:
        cluster = crud_cluster.read(db=self.db, id=id)
        return cluster

    def read_or_create_outlier_cluster(self, aspect_id: int) -> ClusterORM:
        outlier_cluster = crud_cluster.read_outlier_cluster(
            db=self.db, aspect_id=aspect_id
        )
        if outlier_cluster is None:
            clusters = self.create_clusters(
                create_dtos=[
                    ClusterCreateIntern(
                        aspect_id=aspect_id,
                        name="Outlier",
                        is_outlier=True,
                    )
                ]
            )
            outlier_cluster = clusters[0]

        return outlier_cluster

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
        # 1. create clusters
        created_clusters = crud_cluster.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )

        if self.history:
            # 2. register undo
            self.history.register_undo(
                action=PerspectiveDBActions.DELETE_CLUSTERS,
                params={
                    "ids": [cluster.id for cluster in created_clusters],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.CREATE_CLUSTERS,
                params={
                    "orms": [c.as_dict() for c in created_clusters],
                },
            )

        return created_clusters

    def update_clusters(
        self,
        ids: list[int],
        update_dtos: list[ClusterUpdateIntern],
    ) -> list[ClusterORM]:
        # 1. store previous state for undo
        if self.history:
            previous_clusters = crud_cluster.read_by_ids(
                db=self.db,
                ids=ids,
            )
            undo_update_dtos: list[ClusterUpdateIntern] = []
            for update_dto, previous_cluster in zip(update_dtos, previous_clusters):
                undo_update_dto_fields = {}
                for updated_field in update_dto.model_dump(exclude_unset=True).keys():
                    undo_update_dto_fields[updated_field] = getattr(
                        previous_cluster, updated_field
                    )
                undo_update_dtos.append(ClusterUpdateIntern(**undo_update_dto_fields))
            self.history.register_undo(
                action=PerspectiveDBActions.UPDATE_CLUSTERS,
                params={
                    "ids": ids,
                    "update_dtos": undo_update_dtos,
                },
            )

        # 2. perform update
        updated_clusters = crud_cluster.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.UPDATE_CLUSTERS,
                params={
                    "ids": ids,
                    "update_dtos": update_dtos,
                },
            )

        return updated_clusters

    def delete_clusters(
        self,
        cluster_ids: list[int],
    ) -> list[ClusterORM]:
        # 1. delete cluster
        deleted_clusters = crud_cluster.read_by_ids(
            db=self.db,
            ids=cluster_ids,
        )
        crud_cluster.remove_multi(
            db=self.db,
            ids=cluster_ids,
            manual_commit=True,
        )

        if self.history:
            # 2. store old state for undo
            self.history.register_undo(
                action=PerspectiveDBActions.CREATE_CLUSTERS,
                params={
                    "orms": [cluster.as_dict() for cluster in deleted_clusters],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.DELETE_CLUSTERS,
                params={
                    "ids": cluster_ids,
                },
            )

        return deleted_clusters

    def store_cluster_embeddings(
        self,
        project_id: int,
        ids: list[ClusterObjectIdentifier],
        embeddings: list[list[float]],
    ) -> None:
        # 1. register undo
        if self.history:
            try:
                previous_embeddings = crud_cluster_embedding.get_embeddings(
                    client=self.client,
                    project_id=project_id,
                    ids=ids,
                )
            except WeaviateObjectIDNotFoundException:
                previous_embeddings = None
            if previous_embeddings:
                self.history.register_undo(
                    action=PerspectiveDBActions.STORE_CLUSTER_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                        "embeddings": previous_embeddings,
                    },
                )
            else:
                self.history.register_undo(
                    action=PerspectiveDBActions.REMOVE_CLUSTER_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                    },
                )

        # 2. store embeddings
        crud_cluster_embedding.add_embedding_batch(
            client=self.client,
            project_id=project_id,
            ids=ids,
            embeddings=embeddings,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.STORE_CLUSTER_EMBEDDINGS,
                params={
                    "project_id": project_id,
                    "ids": ids,
                    "embeddings": embeddings,
                },
            )

    def remove_cluster_embeddings(
        self,
        project_id: int,
        ids: list[ClusterObjectIdentifier],
    ) -> None:
        # 1. register undo
        if self.history:
            try:
                previous_embeddings = crud_cluster_embedding.get_embeddings(
                    client=self.client,
                    project_id=project_id,
                    ids=ids,
                )
            except WeaviateObjectIDNotFoundException:
                previous_embeddings = None
            if previous_embeddings:
                self.history.register_undo(
                    action=PerspectiveDBActions.STORE_CLUSTER_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                        "embeddings": previous_embeddings,
                    },
                )
            else:
                self.history.register_undo(
                    action=PerspectiveDBActions.REMOVE_CLUSTER_EMBEDDINGS,
                    params={
                        "project_id": project_id,
                        "ids": ids,
                    },
                )

        # 2. remove embeddings
        crud_cluster_embedding.remove_embeddings(
            client=self.client,
            project_id=project_id,
            ids=ids,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.REMOVE_CLUSTER_EMBEDDINGS,
                params={
                    "project_id": project_id,
                    "ids": ids,
                },
            )

    ### DOCUMENT CLUSTER OPERATIONS ###

    def create_document_clusters(
        self,
        create_dtos: list[DocumentClusterCreate],
    ) -> list[DocumentClusterORM]:
        # 1. create document clusters
        created_document_clusters = crud_document_cluster.create_multi(
            db=self.db,
            create_dtos=create_dtos,
            manual_commit=True,
        )

        if self.history:
            # 2. register undo
            self.history.register_undo(
                action=PerspectiveDBActions.DELETE_DOCUMENT_CLUSTERS,
                params={
                    "ids": [
                        (dc.cluster_id, dc.sdoc_id) for dc in created_document_clusters
                    ],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.CREATE_DOCUMENT_CLUSTERS,
                params={
                    "orms": [dc.as_dict() for dc in created_document_clusters],
                },
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
        # 1. store previous state for undo
        if self.history:
            previous_document_clusters = crud_document_cluster.read_by_ids(
                db=self.db,
                ids=ids,
            )
            undo_update_dtos: list[DocumentClusterUpdate] = []
            for update_dto, previous_document_cluster in zip(
                update_dtos, previous_document_clusters
            ):
                undo_update_dto_fields = {}
                for updated_field in update_dto.model_dump(exclude_unset=True).keys():
                    undo_update_dto_fields[updated_field] = getattr(
                        previous_document_cluster, updated_field
                    )
                undo_update_dtos.append(DocumentClusterUpdate(**undo_update_dto_fields))
            self.history.register_undo(
                action=PerspectiveDBActions.UPDATE_DOCUMENT_CLUSTERS,
                params={
                    "ids": ids,
                    "update_dtos": undo_update_dtos,
                },
            )

        # 2. perform update
        updated_document_clusters = crud_document_cluster.update_multi(
            db=self.db,
            ids=ids,
            update_dtos=update_dtos,
            manual_commit=True,
        )

        # 3. register redo
        if self.history:
            self.history.register_redo(
                action=PerspectiveDBActions.UPDATE_DOCUMENT_CLUSTERS,
                params={
                    "ids": ids,
                    "update_dtos": update_dtos,
                },
            )

        return updated_document_clusters

    def delete_document_clusters(
        self,
        ids: list[tuple[int, int]],
    ) -> list[DocumentClusterORM]:
        # 1. delete document clusters
        deleted_document_clusters = crud_document_cluster.delete_multi(
            db=self.db,
            ids=ids,
            manual_commit=True,
        )

        if self.history:
            # 2. store old state for undo
            self.history.register_undo(
                action=PerspectiveDBActions.CREATE_DOCUMENT_CLUSTERS,
                params={
                    "orms": [dc.as_dict() for dc in deleted_document_clusters],
                },
            )

            # 3. register redo
            self.history.register_redo(
                action=PerspectiveDBActions.DELETE_DOCUMENT_CLUSTERS,
                params={
                    "ids": ids,
                },
            )

        return deleted_document_clusters
