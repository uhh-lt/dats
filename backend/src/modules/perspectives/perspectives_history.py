from typing import TYPE_CHECKING, Callable

from loguru import logger
from sqlalchemy.orm import Session
from weaviate import WeaviateClient

from modules.perspectives.cluster.cluster_orm import ClusterORM
from modules.perspectives.document_aspect.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster.document_cluster_orm import (
    DocumentClusterORM,
)
from modules.perspectives.enum.perspectives_db_action import PerspectiveDBActions
from modules.perspectives.enum.perspectives_job_type import PerspectivesJobType
from modules.perspectives.enum.perspectives_user_action import (
    PerspectivesAction,
    PerspectivesUserAction,
)
from modules.perspectives.history.history_crud import crud_perspectives_history
from modules.perspectives.history.history_dto import (
    PerspectivesHistoryCreate,
    PerspectivesHistoryUpdate,
)
from modules.perspectives.history.history_orm import PerspectiveHistoryORM

if TYPE_CHECKING:
    # there is a circular dependency between perspectives_db_transaction and perspectives_history
    from modules.perspectives.perspectives_db_transaction import (
        PerspectivesDBTransaction,
    )


class PerspectivesHistory:
    def __init__(
        self,
        db: Session,
        aspect_id: int,
        perspective_action: PerspectivesAction,
        history_id: int | None = None,
    ):
        self.db = db
        self.aspect_id = aspect_id
        self.perspective_action = perspective_action
        self.undo_stack: list[dict[PerspectiveDBActions, dict]] = []
        self.redo_stack: list[dict[PerspectiveDBActions, dict]] = []
        self.history_id = history_id

        # function mapping
        self.function_mapping: dict[PerspectiveDBActions, Callable] = {
            # Aspect
            PerspectiveDBActions.UPDATE_ASPECT: self.__update_aspect,
            # Document Aspect
            PerspectiveDBActions.CREATE_DOCUMENT_ASPECTS: self.__create_document_aspects,
            PerspectiveDBActions.UPDATE_DOCUMENT_ASPECTS: self.__update_document_aspects,
            PerspectiveDBActions.DELETE_DOCUMENT_ASPECTS: self.__delete_document_aspects,
            PerspectiveDBActions.STORE_DOCUMENT_ASPECT_EMBEDDINGS: self.__store_document_aspect_embeddings,
            PerspectiveDBActions.REMOVE_DOCUMENT_ASPECT_EMBEDDINGS: self.__remove_document_aspect_embeddings,
            # Cluster
            PerspectiveDBActions.CREATE_CLUSTERS: self.__create_clusters,
            PerspectiveDBActions.DELETE_CLUSTERS: self.__delete_clusters,
            PerspectiveDBActions.UPDATE_CLUSTERS: self.__update_clusters,
            PerspectiveDBActions.STORE_CLUSTER_EMBEDDINGS: self.__store_cluster_embeddings,
            PerspectiveDBActions.REMOVE_CLUSTER_EMBEDDINGS: self.__remove_cluster_embeddings,
            # Document Cluster
            PerspectiveDBActions.CREATE_DOCUMENT_CLUSTERS: self.__create_document_clusters,
            PerspectiveDBActions.DELETE_DOCUMENT_CLUSTERS: self.__delete_document_clusters,
            PerspectiveDBActions.UPDATE_DOCUMENT_CLUSTERS: self.__update_document_clusters,
        }

    @classmethod
    def from_history_orm(
        cls, db: Session, history_orm: PerspectiveHistoryORM
    ) -> "PerspectivesHistory":
        """Creates a PerspectivesHistory instance from a PerspectiveHistoryORM."""
        if history_orm.perspectives_action in PerspectivesJobType:
            action = PerspectivesJobType[history_orm.perspectives_action]
        else:
            action = PerspectivesUserAction[history_orm.perspectives_action]
        instance = cls(
            db=db,
            aspect_id=history_orm.aspect_id,
            perspective_action=action,
        )
        instance.undo_stack = history_orm.undo_data
        instance.redo_stack = history_orm.redo_data
        return instance

    def register_undo(self, action: PerspectiveDBActions, params: dict):
        """Registers an undo operation to be executed on rollback."""
        self.undo_stack.append({action: params})

    def register_redo(self, action: PerspectiveDBActions, params: dict):
        """Registers a redo operation to be executed on commit."""
        self.redo_stack.append({action: params})

    def store_history(self, manual_commit: bool):
        """Commits the SQL transaction and clears the undo stack."""

        current_history = crud_perspectives_history.read_by_aspect(
            db=self.db, aspect_id=self.aspect_id
        )

        crud_perspectives_history.create(
            db=self.db,
            create_dto=PerspectivesHistoryCreate(
                perspective_action=self.perspective_action,
                history_number=len(current_history) + 1,
                is_undone=False,
                undo_data=self.undo_stack,
                redo_data=self.redo_stack,
                aspect_id=self.aspect_id,
            ),
            manual_commit=manual_commit,
        )

    def redo(self, db: Session, client: WeaviateClient):
        """Executes all redo operations in the redo stack."""
        from modules.perspectives.perspectives_db_transaction import (
            PerspectivesDBTransaction,
        )

        if self.history_id is None:
            raise ValueError(
                "History ID must be set to redo history. For redo, use from_history_orm()."
            )

        transaction = PerspectivesDBTransaction(
            db=db,
            client=client,
            aspect_id=self.aspect_id,
            perspective_action=self.perspective_action,
            write_history=False,
        )

        try:
            for operation in self.redo_stack:
                for action, params in operation.items():
                    func = self.function_mapping.get(action)
                    if func:
                        func(transaction, params)
                    else:
                        raise ValueError(f"Unknown redo action: {action}")

            # set undone to False
            crud_perspectives_history.update(
                db=db,
                id=self.history_id,
                update_dto=PerspectivesHistoryUpdate(is_undone=False),
                manual_commit=True,  # this is now part of the transaction
            )

            transaction.commit()
            logger.info("Successfully redone history operations.")

        except Exception as e:
            transaction.rollback()
            raise e

    def undo(self, db: Session, client: WeaviateClient):
        """Executes all undo operations in the undo stack."""
        from modules.perspectives.perspectives_db_transaction import (
            PerspectivesDBTransaction,
        )

        if self.history_id is None:
            raise ValueError(
                "History ID must be set to undo history. For undo, use from_history_orm()."
            )

        transaction = PerspectivesDBTransaction(
            db=db,
            client=client,
            aspect_id=self.aspect_id,
            perspective_action=self.perspective_action,
            write_history=False,
        )

        try:
            for operation in reversed(self.undo_stack):
                for action, params in operation.items():
                    func = self.function_mapping.get(action)
                    if func:
                        func(transaction, params)
                    else:
                        raise ValueError(f"Unknown undo action: {action}")

            # set undone to True
            crud_perspectives_history.update(
                db=db,
                id=self.history_id,
                update_dto=PerspectivesHistoryUpdate(is_undone=True),
                manual_commit=True,  # this is now part of the transaction
            )

            transaction.commit()
            logger.info("Successfully undone history operations.")

        except Exception as e:
            transaction.rollback()
            raise e

    ### ASPECT OPERATIONS ###

    def __update_aspect(self, transaction: PerspectivesDBTransaction, params: dict):
        assert "id" in params, "Aspect ID must be provided in params"
        assert "update_dto" in params, "Aspect update DTO must be provided in params"

        transaction.update_aspect(**params)

    ### DOCUMENT ASPECT OPERATIONS ###

    def __create_document_aspects(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "orms" in params, "DocumenAspectORMs must be provided in params"

        transaction.db.add_all([DocumentAspectORM(**orm) for orm in params["orms"]])
        transaction.db.flush()

    def __update_document_aspects(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "ids" in params, "IDs must be provided in params"
        assert "update_dtos" in params, (
            "DocumentAspectUpdates must be provided in params"
        )

        transaction.update_document_aspects(**params)

    def __delete_document_aspects(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "ids" in params, "IDs must be provided in params"

        transaction.delete_document_aspects(**params)

    def __store_document_aspect_embeddings(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "project_id" in params, "Project ID must be provided in params"
        assert "ids" in params, "IDs must be provided in params"
        assert "embeddings" in params, "Embeddings must be provided in params"

        transaction.store_document_aspect_embeddings(**params)

    def __remove_document_aspect_embeddings(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "project_id" in params, "Project ID must be provided in params"
        assert "ids" in params, "IDs must be provided in params"

        transaction.remove_document_aspect_embeddings(**params)

    ### CLUSTER OPERATIONS ###

    def __create_clusters(self, transaction: PerspectivesDBTransaction, params: dict):
        assert "orms" in params, "ClusterORMs must be provided in params"

        transaction.db.add_all([ClusterORM(**orm) for orm in params["orms"]])
        transaction.db.flush()

    def __update_clusters(self, transaction: PerspectivesDBTransaction, params: dict):
        assert "ids" in params, "Cluster IDs must be provided in params"
        assert "update_dtos" in params, "Cluster update DTOs must be provided in params"

        transaction.update_clusters(**params)

    def __delete_clusters(self, transaction: PerspectivesDBTransaction, params: dict):
        assert "ids" in params, "Cluster IDs must be provided in params"

        transaction.delete_clusters(**params)

    def __store_cluster_embeddings(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "project_id" in params, "Project ID must be provided in params"
        assert "ids" in params, "IDs must be provided in params"
        assert "embeddings" in params, "Embeddings must be provided in params"

        transaction.store_cluster_embeddings(**params)

    def __remove_cluster_embeddings(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "project_id" in params, "Project ID must be provided in params"
        assert "ids" in params, "IDs must be provided in params"

        transaction.remove_cluster_embeddings(**params)

    ### DOCUMENT CLUSTER OPERATIONS ###

    def __create_document_clusters(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "orms" in params, "DocumentClusterORMs must be provided in params"

        transaction.db.add_all([DocumentClusterORM(**orm) for orm in params["orms"]])
        transaction.db.flush()

    def __update_document_clusters(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "ids" in params, "IDs must be provided in params"
        assert "update_dtos" in params, (
            "DocumentClusterUpdate DTOs must be provided in params"
        )

        transaction.update_document_clusters(**params)

    def __delete_document_clusters(
        self, transaction: PerspectivesDBTransaction, params: dict
    ):
        assert "ids" in params, "IDs must be provided in params"

        transaction.delete_document_clusters(**params)
