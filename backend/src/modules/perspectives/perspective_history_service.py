import logging
from typing import Any, List

from sqlalchemy.orm import Session

from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.cluster_embedding_crud import crud_cluster_embedding
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from modules.perspectives.history_orm import PerspectiveHistoryORM
from repos.vector.weaviate_repo import WeaviateRepo

logger = logging.getLogger(__name__)


class PerspectiveHistoryService:
    def __init__(self, weaviate_repo: WeaviateRepo):
        self.weaviate = weaviate_repo

    def snapshot_cluster(self, db: Session, cluster_id: int) -> dict[str, Any]:
        """Captures the full state of a cluster including its embedding."""
        cluster = crud_cluster.read(db=db, id=cluster_id)
        if not cluster:
            raise ValueError(f"Cluster {cluster_id} not found for snapshot.")

        # Read embedding
        # We need project_id for weaviate access.
        # Cluster -> Aspect -> Project
        aspect = cluster.aspect
        embedding = None
        with self.weaviate.weaviate_session() as client:
            embedding = crud_cluster_embedding.get_embedding(
                client=client,
                project_id=aspect.project_id,
                id=ClusterObjectIdentifier(aspect_id=aspect.id, cluster_id=cluster.id),
            )

        return {
            "type": "CLUSTER_SNAPSHOT",
            "cluster_data": {
                "id": cluster.id,
                "aspect_id": cluster.aspect_id,
                "parent_cluster_id": cluster.parent_cluster_id,
                "level": cluster.level,
                "name": cluster.name,
                "description": cluster.description,
                "is_outlier": cluster.is_outlier,
                "x": cluster.x,
                "y": cluster.y,
                "top_words": cluster.top_words,
                "top_word_scores": cluster.top_word_scores,
                "top_docs": cluster.top_docs,
                "is_user_edited": cluster.is_user_edited,
            },
            "cluster_embedding": embedding,
            "project_id": aspect.project_id,
        }

    def snapshot_cluster_deletion(
        self, db: Session, cluster_id: int, aspect_id: int, project_id: int
    ) -> dict[str, Any]:
        """Captures the event of a cluster deletion (so it can be re-applied)."""
        return {
            "type": "CLUSTER_DELETION",
            "cluster_id": cluster_id,
            "aspect_id": aspect_id,
            "project_id": project_id,
        }

    def snapshot_assignments(self, db: Session, sdoc_ids: List[int]) -> dict[str, Any]:
        """Captures the current assignments for a list of sdocs."""
        assignments = []
        if sdoc_ids:
            docs = (
                db.query(DocumentClusterORM)
                .filter(DocumentClusterORM.sdoc_id.in_(sdoc_ids))
                .all()
            )
            assignments = [
                {
                    "sdoc_id": d.sdoc_id,
                    "cluster_id": d.cluster_id,  # Can be None? DocumentClusterORM PK includes cluster_id usually?
                    # If assignment exists, it has a cluster_id.
                    "is_accepted": d.is_accepted,
                    "similarity": d.similarity,
                }
                for d in docs
            ]

        return {"type": "ASSIGNMENT_SNAPSHOT", "assignments": assignments}

    def apply_snapshot(self, db: Session, snapshot: dict[str, Any]):
        """Dispatches snapshot application based on type."""
        snapshot_type = snapshot.get("type")
        if snapshot_type == "CLUSTER_SNAPSHOT":
            self._apply_cluster_snapshot(db, snapshot)
        elif snapshot_type == "ASSIGNMENT_SNAPSHOT":
            self._apply_assignments_snapshot(db, snapshot)
        elif snapshot_type == "CLUSTER_DELETION":
            self._apply_cluster_deletion(db, snapshot)
        else:
            logger.warning(f"Unknown snapshot type: {snapshot_type}")

    def _apply_cluster_snapshot(self, db: Session, snapshot: dict[str, Any]):
        cluster_data = snapshot["cluster_data"]
        cluster_embedding = snapshot["cluster_embedding"]
        project_id = snapshot["project_id"]

        # Restore Cluster
        # Check if exists, if so, update? Or assume clear slate?
        # In undo/redo, usually we are restoring into a state where it shouldn't exist (if creating) or reusing.
        # But if we blindly add, we might crash on PK.
        existing = (
            db.query(ClusterORM).filter(ClusterORM.id == cluster_data["id"]).first()
        )
        if existing:
            # Update
            for k, v in cluster_data.items():
                setattr(existing, k, v)
        else:
            # Insert
            cleaned_data = cluster_data.copy()
            # aspect_id is foreign key, check if aspect exists? Assumed yes.
            db.add(ClusterORM(**cleaned_data))

        db.flush()

        # Restore Embedding
        if cluster_embedding:
            with self.weaviate.weaviate_session() as client:
                crud_cluster_embedding.add_embedding_batch(
                    client=client,
                    project_id=project_id,
                    ids=[
                        ClusterObjectIdentifier(
                            aspect_id=cluster_data["aspect_id"],
                            cluster_id=cluster_data["id"],
                        )
                    ],
                    embeddings=[cluster_embedding],
                )

    def _apply_cluster_deletion(self, db: Session, snapshot: dict[str, Any]):
        cluster_id = snapshot["cluster_id"]
        project_id = snapshot["project_id"]
        aspect_id = snapshot["aspect_id"]

        # Delete Cluster
        crud_cluster.delete(db=db, id=cluster_id)

        # Delete Embedding
        with self.weaviate.weaviate_session() as client:
            crud_cluster_embedding.remove_embedding(
                client=client,
                project_id=project_id,
                id=ClusterObjectIdentifier(aspect_id=aspect_id, cluster_id=cluster_id),
            )

    def _apply_assignments_snapshot(self, db: Session, snapshot: dict[str, Any]):
        assignments = snapshot["assignments"]
        if not assignments:
            return

        sdoc_ids = [a["sdoc_id"] for a in assignments]

        # Clear existing assignments for these docs
        # Note: DocumentClusterORM PK is (sdoc_id, cluster_id).
        # A doc can technically belong to multiple clusters if model allows.
        # But here we assume we are restoring specific state.
        # If we delete by sdoc_id, we remove ALL cluster assignments for that doc.
        db.query(DocumentClusterORM).filter(
            DocumentClusterORM.sdoc_id.in_(sdoc_ids)
        ).delete(synchronize_session=False)
        db.flush()

        # Create restored assignments
        # for item in assignments:
        #     crud_document_cluster.update(
        #         db=db,
        #         update_dto=DocumentClusterUpdate(
        #             sdoc_id=item["sdoc_id"],
        #             cluster_id=item["cluster_id"],
        #             is_accepted=item["is_accepted"],
        #             similarity=item["similarity"],
        #         ),
        #     )

    def revert_to_history(
        self, db: Session, aspect_id: int, target_history_id: int | None
    ):
        """
        Reverts the aspect state to the point *after* target_history_id.
        """
        # 1. Get history
        history = (
            db.query(PerspectiveHistoryORM)
            .filter(PerspectiveHistoryORM.aspect_id == aspect_id)
            .order_by(PerspectiveHistoryORM.created_at.asc())
            .all()
        )

        if not history:
            return

        # 2. Iterate and apply
        # Make a single loop?
        # Revert 'Future' (Applied actions > target) -> Undo
        # Apply 'Past' (Undone actions <= target) -> Redo

        for record in reversed(history):
            # UNDO: If record > target and is APPLIED
            if (
                target_history_id is None or record.id > target_history_id
            ) and not record.is_undone:
                logger.info(f"Undoing action {record.id}")
                # undo_data is a list of snapshots? or dict?
                # It should be a list of snapshots to apply in order.
                snapshots = record.undo_data
                if isinstance(snapshots, dict):  # Handle legacy or single snapshot
                    snapshots = [snapshots]

                for snap in snapshots:
                    self.apply_snapshot(db, snap)

                record.is_undone = True
                db.commit()

        for record in history:
            # REDO: If record <= target and is UNDONE
            if (
                target_history_id is not None
                and record.id <= target_history_id
                and record.is_undone
            ):
                logger.info(f"Redoing action {record.id}")
                snapshots = record.redo_data
                if isinstance(snapshots, dict):
                    snapshots = [snapshots]

                for snap in snapshots:
                    self.apply_snapshot(db, snap)

                record.is_undone = False
                db.commit()

    def record_history(
        self,
        db: Session,
        aspect_id: int,
        action_type: str,
        undo_snapshots: list,
        redo_snapshots: list,
    ):
        """Creates a history record and clears future."""
        # Clear future redo stack
        # (Technically with Revert logic we might NOT need to delete, but standard practice:
        # if you diverge from a past state, the old future is invalid.)

        # Current Head?
        # We need to find the latest "Applied" action.
        # If there are "Undone" actions (is_undone=True) that are OLDER than this new action?
        # Wait, if we are at state X (Head), and we do action Y.
        # Any history AFTER Head should be wiped.

        # Logic:
        # 1. Find latest applied action date?
        # Actually, simpler: Any action that is `is_undone=True` implies we are branching from before it.
        # So we delete everything that is `is_undone=True`.
        db.query(PerspectiveHistoryORM).filter(
            PerspectiveHistoryORM.aspect_id == aspect_id,
            PerspectiveHistoryORM.is_undone,
        ).delete()

        history = PerspectiveHistoryORM(
            aspect_id=aspect_id,
            action_type=action_type,
            undo_data=undo_snapshots,
            redo_data=redo_snapshots,
            is_undone=False,
        )
        db.add(history)
        db.commit()
