from uuid import UUID, uuid4

from fastapi import status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from common.exception_handler import exception_handler
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_branch_crud import crud_code_branch
from core.code.code_dto import (
    CodeBranchChangeRead,
    CodeBranchChangeType,
    CodeChangedField,
    CodeChangeKind,
    CodeChangelogChange,
    CodeChangelogEntry,
    CodeConflictResolution,
    CodeCreate,
    CodeDelete,
    CodeDeleteStrategy,
    CodeMerge,
    CodeRead,
    CodeUpdate,
)
from core.code.code_orm import CodeORM
from core.memo.object_handle_orm import ObjectHandleORM
from repos.db.crud_base import NoSuchElementError

INCLUDE_SYSTEM_CODES_IN_CHANGELOG = False


@exception_handler(status.HTTP_409_CONFLICT)
class CodeVersionConflictError(Exception):
    pass


@exception_handler(
    status.HTTP_409_CONFLICT,
    extract_content=lambda exc: {
        "message": str(exc),
        "concept_ids": getattr(exc, "concept_ids", []),
    },
)
class CodeMergeConflictError(Exception):
    def __init__(self, concept_ids: list[UUID]):
        self.concept_ids = concept_ids
        super().__init__(
            "Main changed since the branch override was created for concepts: "
            + ", ".join(map(str, concept_ids))
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidCodeTreeError(Exception):
    pass


class CodeService:
    _payload_fields = (
        "name",
        "color",
        "description",
        "parent_concept_id",
        "enabled",
        "is_system",
    )

    def read_branch(self, db: Session, *, branch_id: int, project_id: int):
        branch = crud_code_branch.read(db=db, id=branch_id)
        if branch.project_id != project_id or branch.is_archived:
            raise InvalidCodeTreeError(
                "Branch is archived or belongs to another project"
            )
        return branch

    def archive_branch(self, db: Session, *, branch_id: int):
        branch = crud_code_branch.read(db=db, id=branch_id)
        if branch.is_archived:
            return branch
        db.query(CodeORM).filter(
            CodeORM.branch_id == branch_id,
            CodeORM.is_active == True,  # noqa: E712
        ).update({CodeORM.is_active: False}, synchronize_session=False)
        branch.is_archived = True
        db.add(branch)
        db.flush()
        return branch

    def read_active_main(
        self, db: Session, *, project_id: int, concept_id: UUID
    ) -> CodeORM | None:
        return (
            db.query(CodeORM)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.branch_id.is_(None),
                CodeORM.concept_id == concept_id,
                CodeORM.is_active == True,  # noqa: E712
            )
            .first()
        )

    def read_visible_map(
        self,
        db: Session,
        *,
        project_id: int,
        branch_id: int | None = None,
        include_deleted: bool = False,
    ) -> dict[UUID, CodeORM]:
        if branch_id is not None:
            self.read_branch(db, branch_id=branch_id, project_id=project_id)

        main_codes = (
            db.query(CodeORM)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.branch_id.is_(None),
                CodeORM.is_active == True,  # noqa: E712
            )
            .all()
        )
        visible = {code.concept_id: code for code in main_codes}

        if branch_id is not None:
            branch_codes = (
                db.query(CodeORM)
                .filter(
                    CodeORM.project_id == project_id,
                    CodeORM.branch_id == branch_id,
                    CodeORM.is_active == True,  # noqa: E712
                )
                .all()
            )
            visible.update({code.concept_id: code for code in branch_codes})

        if include_deleted:
            return visible
        return {
            concept_id: code
            for concept_id, code in visible.items()
            if not code.is_deleted
        }

    def read_visible(
        self, db: Session, *, project_id: int, branch_id: int | None = None
    ) -> list[CodeORM]:
        visible = self.read_visible_map(db, project_id=project_id, branch_id=branch_id)
        self._validate_tree(visible)
        return sorted(visible.values(), key=lambda code: code.id)

    def read_branch_changes(
        self, db: Session, *, branch_id: int
    ) -> list[CodeBranchChangeRead]:
        branch = crud_code_branch.read(db=db, id=branch_id)
        if branch.is_archived:
            raise InvalidCodeTreeError("Archived branches do not have active changes")

        branch_codes = (
            db.query(CodeORM)
            .filter(
                CodeORM.branch_id == branch_id,
                CodeORM.is_active == True,  # noqa: E712
            )
            .order_by(CodeORM.id)
            .all()
        )
        base_ids = [
            code.base_main_code_id
            for code in branch_codes
            if code.base_main_code_id is not None
        ]
        bases = (
            db.query(CodeORM).filter(CodeORM.id.in_(base_ids)).all() if base_ids else []
        )
        base_by_id = {code.id: code for code in bases}
        current_main = self.read_visible_map(
            db, project_id=branch.project_id, include_deleted=True
        )

        result: list[CodeBranchChangeRead] = []
        for branch_code in branch_codes:
            base = (
                base_by_id.get(branch_code.base_main_code_id)
                if branch_code.base_main_code_id is not None
                else None
            )
            current = current_main.get(branch_code.concept_id)
            current_id = current.id if current is not None else None
            changed_fields = self._changed_fields(base, branch_code)
            if branch_code.is_deleted:
                change_type = CodeBranchChangeType.DELETED
            elif base is None:
                change_type = CodeBranchChangeType.ADDED
            else:
                change_type = CodeBranchChangeType.MODIFIED
            result.append(
                CodeBranchChangeRead(
                    concept_id=branch_code.concept_id,
                    change_type=change_type,
                    changed_fields=changed_fields,
                    branch_code=CodeRead.model_validate(branch_code),
                    base_main_code=(
                        CodeRead.model_validate(base) if base is not None else None
                    ),
                    current_main_code=(
                        CodeRead.model_validate(current)
                        if current is not None
                        else None
                    ),
                    is_conflict=current_id != branch_code.base_main_code_id,
                )
            )
        return result

    def read_snapshots(
        self, db: Session, *, project_id: int, code_ids: list[int]
    ) -> list[CodeORM]:
        unique_ids = list(dict.fromkeys(code_ids))
        snapshots = db.query(CodeORM).filter(CodeORM.id.in_(unique_ids)).all()
        snapshots_by_id = {snapshot.id: snapshot for snapshot in snapshots}
        missing = [code_id for code_id in unique_ids if code_id not in snapshots_by_id]
        if missing:
            raise NoSuchElementError(CodeORM, ids=missing)
        if any(snapshot.project_id != project_id for snapshot in snapshots):
            raise InvalidCodeTreeError("Code snapshot belongs to another project")
        return [snapshots_by_id[code_id] for code_id in unique_ids]

    def create(
        self, db: Session, *, create_dto: CodeCreate, author_id: int | None
    ) -> CodeORM:
        if create_dto.branch_id is not None:
            self.read_branch(
                db,
                branch_id=create_dto.branch_id,
                project_id=create_dto.project_id,
            )
        visible = self.read_visible_map(
            db,
            project_id=create_dto.project_id,
            branch_id=create_dto.branch_id,
        )
        self._validate_parent(
            visible=visible,
            concept_id=None,
            parent_concept_id=create_dto.parent_concept_id,
        )
        code = CodeORM(
            name=create_dto.name,
            color=create_dto.color,
            description=create_dto.description,
            parent_concept_id=create_dto.parent_concept_id,
            enabled=create_dto.enabled,
            is_system=create_dto.is_system,
            project_id=create_dto.project_id,
            branch_id=create_dto.branch_id,
            author_id=author_id,
            commit_message=create_dto.commit_message,
            change_set_id=uuid4(),
            change_kind=CodeChangeKind.CREATE.value,
        )
        db.add(code)
        db.flush()
        return code

    def update(
        self,
        db: Session,
        *,
        code_id: int,
        update_dto: CodeUpdate,
        author_id: int | None,
    ) -> CodeORM:
        source = self._read_active_snapshot(db, code_id=code_id)
        target_branch_id = update_dto.branch_id
        if target_branch_id is not None:
            self.read_branch(
                db, branch_id=target_branch_id, project_id=source.project_id
            )
        visible = self.read_visible_map(
            db,
            project_id=source.project_id,
            branch_id=target_branch_id,
        )
        if visible.get(source.concept_id) is not source:
            raise CodeVersionConflictError(
                "The supplied snapshot is not visible in the target scope"
            )

        update_data = update_dto.model_dump(
            exclude_unset=True, exclude={"branch_id", "commit_message"}
        )
        parent_concept_id = update_data.get(
            "parent_concept_id", source.parent_concept_id
        )
        self._validate_parent(
            visible=visible,
            concept_id=source.concept_id,
            parent_concept_id=parent_concept_id,
        )
        change_set_id = uuid4()
        successor = self._version_snapshot(
            db,
            source=source,
            target_branch_id=target_branch_id,
            changes=update_data,
            author_id=author_id,
            commit_message=update_dto.commit_message,
            change_set_id=change_set_id,
            change_kind=CodeChangeKind.UPDATE,
        )
        if "enabled" in update_data:
            children_by_parent: dict[UUID, list[CodeORM]] = {}
            for code in visible.values():
                if code.parent_concept_id is not None:
                    children_by_parent.setdefault(code.parent_concept_id, []).append(
                        code
                    )
            for descendant in self._subtree(source, children_by_parent)[1:]:
                if descendant.enabled == update_data["enabled"]:
                    continue
                self._version_snapshot(
                    db,
                    source=descendant,
                    target_branch_id=target_branch_id,
                    changes={"enabled": update_data["enabled"]},
                    author_id=author_id,
                    commit_message=update_dto.commit_message,
                    change_set_id=change_set_id,
                    change_kind=CodeChangeKind.UPDATE,
                )
        return successor

    def tombstone(
        self,
        db: Session,
        *,
        code_id: int,
        delete_dto: CodeDelete,
        author_id: int | None,
    ) -> list[CodeORM]:
        source = self._read_active_snapshot(db, code_id=code_id)
        visible = self.read_visible_map(
            db,
            project_id=source.project_id,
            branch_id=delete_dto.branch_id,
        )
        if visible.get(source.concept_id) is not source:
            raise CodeVersionConflictError(
                "The supplied snapshot is not visible in the target scope"
            )

        children_by_parent: dict[UUID, list[CodeORM]] = {}
        for code in visible.values():
            if code.parent_concept_id is not None:
                children_by_parent.setdefault(code.parent_concept_id, []).append(code)

        affected: list[CodeORM] = []
        change_set_id = uuid4()
        direct_children = children_by_parent.get(source.concept_id, [])
        if delete_dto.strategy == CodeDeleteStrategy.LIFT_CHILDREN:
            for child in direct_children:
                affected.append(
                    self._version_snapshot(
                        db,
                        source=child,
                        target_branch_id=delete_dto.branch_id,
                        changes={"parent_concept_id": source.parent_concept_id},
                        author_id=author_id,
                        commit_message=delete_dto.commit_message,
                        change_set_id=change_set_id,
                        change_kind=CodeChangeKind.DELETE,
                    )
                )
            targets = [source]
        else:
            targets = self._subtree(source, children_by_parent)

        for target in targets:
            affected.append(
                self._version_snapshot(
                    db,
                    source=target,
                    target_branch_id=delete_dto.branch_id,
                    changes={"is_deleted": True},
                    author_id=author_id,
                    commit_message=delete_dto.commit_message,
                    change_set_id=change_set_id,
                    change_kind=CodeChangeKind.DELETE,
                )
            )
        return affected

    def merge(
        self,
        db: Session,
        *,
        branch_id: int,
        merge_dto: CodeMerge,
        author_id: int | None,
    ) -> tuple[list[CodeORM], list[UUID]]:
        """Promote active branch snapshots into Main as one atomic operation.

        A merge preserves the append-only snapshot model: branch rows are never
        mutated into Main rows. For every selected branch change, this method
        verifies that Main still matches the change's merge base, validates the
        resulting Main hierarchy, deactivates the previous active Main snapshot,
        and inserts a new Main snapshot with the same ``concept_id`` and payload.

        Annotations pointing to the exact active branch snapshot are reassigned
        to the newly inserted Main snapshot. Those two snapshots have identical
        semantic payloads at merge time, so this removes the obsolete branch
        provenance without silently changing the annotation's meaning. Annotations
        using older, inactive snapshots of the same branch concept are deliberately
        left untouched: they may represent an earlier definition and must continue
        through the normal review workflow.

        Tombstones are promoted using the same snapshot rules. A tombstone for a
        concept that never existed in Main is discarded because it has no observable
        Main effect. Object handles and attached memos are moved to the new Main
        snapshot, while all historical Code rows remain available for audit history.

        Args:
            db: SQLAlchemy session containing the merge transaction.
            branch_id: Collaborative branch whose active changes are being promoted.
            merge_dto: Optional concept selection and merge commit message. When no
                concept IDs are supplied, every active change in the branch is merged.
            author_id: User recorded as author of each new Main snapshot.

        Returns:
            A pair containing the new active Main snapshots and concept IDs of
            no-op tombstones that were discarded.

        Raises:
            InvalidCodeTreeError: If the branch is archived, a selected concept has
                no active branch change, or the merged hierarchy would be invalid.
            CodeMergeConflictError: If Main changed after a branch change captured
                its merge base. No selected change is promoted in this case.

        The caller owns the transaction boundary; this method flushes its changes
        but does not commit them.
        """
        branch = crud_code_branch.read(db=db, id=branch_id)
        if branch.is_archived:
            raise InvalidCodeTreeError("Archived branches cannot be merged")
        query = db.query(CodeORM).filter(
            CodeORM.branch_id == branch_id,
            CodeORM.is_active == True,  # noqa: E712
        )
        if merge_dto.concept_ids is not None:
            query = query.filter(CodeORM.concept_id.in_(merge_dto.concept_ids))
        changes = query.all()
        if merge_dto.concept_ids is not None:
            found = {code.concept_id for code in changes}
            missing = set(merge_dto.concept_ids) - found
            if missing:
                raise InvalidCodeTreeError(
                    f"No active branch change exists for concepts: {sorted(map(str, missing))}"
                )

        main = self.read_visible_map(
            db, project_id=branch.project_id, include_deleted=True
        )
        conflicts: list[UUID] = []
        for change in changes:
            current = main.get(change.concept_id)
            current_id = current.id if current is not None else None
            if current_id != change.base_main_code_id:
                conflicts.append(change.concept_id)
        if conflicts:
            raise CodeMergeConflictError(conflicts)

        future_main = {
            concept_id: code for concept_id, code in main.items() if not code.is_deleted
        }
        for change in changes:
            if change.is_deleted:
                future_main.pop(change.concept_id, None)
            else:
                future_main[change.concept_id] = change
        self._validate_tree(future_main)

        merged: list[CodeORM] = []
        discarded: list[UUID] = []
        change_set_id = uuid4()
        for change in changes:
            current = main.get(change.concept_id)
            if current is None and change.is_deleted:
                change.is_active = False
                discarded.append(change.concept_id)
                continue
            if current is not None:
                current.is_active = False
            successor = self._clone(
                change,
                branch_id=None,
                base_main_code_id=None,
                author_id=author_id,
                commit_message=merge_dto.commit_message,
                change_set_id=change_set_id,
                change_kind=CodeChangeKind.MERGE,
                previous_code_id=current.id if current is not None else None,
                merged_from_code_id=change.id,
            )
            db.add(successor)
            db.flush()
            memo_source = current if current is not None else change
            self._move_object_handle(
                db, source_code_id=memo_source.id, target_code_id=successor.id
            )
            self._promote_annotations(
                db,
                source_code_id=change.id,
                target_code_id=successor.id,
            )
            change.is_active = False
            merged.append(successor)
        db.flush()
        return merged, discarded

    def _promote_annotations(
        self,
        db: Session,
        *,
        source_code_id: int,
        target_code_id: int,
    ) -> None:
        """Repoint every annotation type from a merged snapshot to its Main clone."""
        db.query(SpanAnnotationORM).filter(
            SpanAnnotationORM.code_id == source_code_id
        ).update(
            {SpanAnnotationORM.code_id: target_code_id}, synchronize_session="fetch"
        )
        db.query(SentenceAnnotationORM).filter(
            SentenceAnnotationORM.code_id == source_code_id
        ).update(
            {SentenceAnnotationORM.code_id: target_code_id},
            synchronize_session="fetch",
        )
        db.query(BBoxAnnotationORM).filter(
            BBoxAnnotationORM.code_id == source_code_id
        ).update(
            {BBoxAnnotationORM.code_id: target_code_id}, synchronize_session="fetch"
        )

    def resolve_conflict(
        self,
        db: Session,
        *,
        branch_id: int,
        concept_id: UUID,
        resolution: CodeConflictResolution,
        author_id: int | None,
        commit_message: str | None,
    ) -> CodeORM | None:
        branch_change = (
            db.query(CodeORM)
            .filter(
                CodeORM.branch_id == branch_id,
                CodeORM.concept_id == concept_id,
                CodeORM.is_active == True,  # noqa: E712
            )
            .first()
        )
        if branch_change is None:
            raise NoSuchElementError(
                CodeORM, branch_id=branch_id, concept_id=concept_id
            )
        if resolution == CodeConflictResolution.DISCARD_BRANCH:
            branch_change.is_active = False
            db.flush()
            return None

        current_main = self.read_active_main(
            db, project_id=branch_change.project_id, concept_id=concept_id
        )
        branch_change.is_active = False
        successor = self._clone(
            branch_change,
            branch_id=branch_id,
            base_main_code_id=current_main.id if current_main else None,
            author_id=author_id,
            commit_message=commit_message,
            change_set_id=uuid4(),
            change_kind=CodeChangeKind.CONFLICT_RESOLUTION,
            previous_code_id=branch_change.id,
        )
        db.add(successor)
        db.flush()
        self._move_object_handle(
            db, source_code_id=branch_change.id, target_code_id=successor.id
        )
        return successor

    def history(
        self, db: Session, *, project_id: int, concept_id: UUID
    ) -> list[CodeORM]:
        return (
            db.query(CodeORM)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.concept_id == concept_id,
            )
            .order_by(CodeORM.created.desc(), CodeORM.id.desc())
            .all()
        )

    def changelog(
        self,
        db: Session,
        *,
        project_id: int,
        branch_id: int | None,
        page: int,
        page_size: int,
    ) -> tuple[int, list[CodeChangelogEntry]]:
        """Return paginated code changes relevant to the selected codebook.

        Main includes only Main change sets. A selected branch includes Main plus
        that branch's change sets, matching the same live-overlay semantics used by
        the visible code tree. Activity from unrelated branches is never returned.
        Pagination operates on ``change_set_id`` rather than Code rows so cascades
        and multi-code merges remain one expandable changelog entry.
        """
        if branch_id is not None:
            self.read_branch(db, branch_id=branch_id, project_id=project_id)

        scope_filter = CodeORM.branch_id.is_(None)
        if branch_id is not None:
            scope_filter = or_(scope_filter, CodeORM.branch_id == branch_id)

        filters = [CodeORM.project_id == project_id, scope_filter]
        if not INCLUDE_SYSTEM_CODES_IN_CHANGELOG:
            filters.append(CodeORM.is_system == False)  # noqa: E712
        total = (
            db.query(func.count(func.distinct(CodeORM.change_set_id)))
            .filter(*filters)
            .scalar()
            or 0
        )
        groups = (
            db.query(
                CodeORM.change_set_id,
                func.max(CodeORM.created).label("latest_created"),
                func.max(CodeORM.id).label("latest_id"),
            )
            .filter(*filters)
            .group_by(CodeORM.change_set_id)
            .order_by(
                func.max(CodeORM.created).desc(),
                func.max(CodeORM.id).desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        change_set_ids = [group.change_set_id for group in groups]
        if not change_set_ids:
            return total, []

        snapshots = (
            db.query(CodeORM)
            .options(
                selectinload(CodeORM.previous_code),
                selectinload(CodeORM.merged_from_code),
            )
            .filter(*filters, CodeORM.change_set_id.in_(change_set_ids))
            .order_by(CodeORM.id)
            .all()
        )
        snapshots_by_change_set: dict[UUID, list[CodeORM]] = {}
        for snapshot in snapshots:
            snapshots_by_change_set.setdefault(snapshot.change_set_id, []).append(
                snapshot
            )

        entries: list[CodeChangelogEntry] = []
        for change_set_id in change_set_ids:
            changes = snapshots_by_change_set.get(change_set_id, [])
            if not changes:
                continue
            representative = changes[-1]
            if representative.created is None:
                raise InvalidCodeTreeError(
                    "Code changelog snapshot is missing its creation timestamp"
                )
            merged_sources = [
                snapshot.merged_from_code
                for snapshot in changes
                if snapshot.merged_from_code is not None
            ]
            source_branch_id = merged_sources[0].branch_id if merged_sources else None
            entries.append(
                CodeChangelogEntry(
                    change_set_id=change_set_id,
                    change_kind=CodeChangeKind(representative.change_kind),
                    message=representative.commit_message,
                    author_id=representative.author_id,
                    created=representative.created,
                    branch_id=representative.branch_id,
                    source_branch_id=source_branch_id,
                    changes=[
                        CodeChangelogChange(
                            before=(
                                CodeRead.model_validate(snapshot.previous_code)
                                if snapshot.previous_code is not None
                                else None
                            ),
                            after=CodeRead.model_validate(snapshot),
                            merged_from=(
                                CodeRead.model_validate(snapshot.merged_from_code)
                                if snapshot.merged_from_code is not None
                                else None
                            ),
                            changed_fields=self._changed_fields(
                                snapshot.previous_code, snapshot
                            ),
                        )
                        for snapshot in changes
                    ],
                )
            )
        return total, entries

    def snapshot_ids_for_code_ids(
        self, db: Session, *, code_ids: list[int]
    ) -> list[int]:
        if not code_ids:
            return []
        concepts = [
            row[0]
            for row in db.query(CodeORM.concept_id)
            .filter(CodeORM.id.in_(code_ids))
            .distinct()
            .all()
        ]
        if not concepts:
            return []
        return [
            row[0]
            for row in db.query(CodeORM.id)
            .filter(CodeORM.concept_id.in_(concepts))
            .all()
        ]

    def canonical_code_id_by_snapshot(
        self, db: Session, *, code_ids: list[int]
    ) -> dict[int, int]:
        selected = db.query(CodeORM).filter(CodeORM.id.in_(code_ids)).all()
        canonical_by_concept = {code.concept_id: code.id for code in selected}
        if not canonical_by_concept:
            return {}
        snapshots = (
            db.query(CodeORM.id, CodeORM.concept_id)
            .filter(CodeORM.concept_id.in_(canonical_by_concept))
            .all()
        )
        return {
            snapshot_id: canonical_by_concept[concept_id]
            for snapshot_id, concept_id in snapshots
        }

    def validate_annotation_code(
        self, db: Session, *, code_id: int, project_id: int
    ) -> CodeORM:
        code = (
            db.query(CodeORM)
            .filter(
                CodeORM.id == code_id,
                CodeORM.project_id == project_id,
                CodeORM.is_active == True,  # noqa: E712
                CodeORM.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if code is None:
            raise InvalidCodeTreeError(
                "Annotations require an active, non-deleted Code snapshot"
            )
        if code.branch is not None and code.branch.is_archived:
            raise InvalidCodeTreeError("Annotations cannot use an archived branch")
        return code

    def _read_active_snapshot(self, db: Session, *, code_id: int) -> CodeORM:
        code = db.query(CodeORM).filter(CodeORM.id == code_id).first()
        if code is None:
            raise NoSuchElementError(CodeORM, id=code_id)
        if not code.is_active:
            raise CodeVersionConflictError("The code snapshot is no longer active")
        return code

    def _version_snapshot(
        self,
        db: Session,
        *,
        source: CodeORM,
        target_branch_id: int | None,
        changes: dict,
        author_id: int | None,
        commit_message: str | None,
        change_set_id: UUID,
        change_kind: CodeChangeKind,
    ) -> CodeORM:
        if target_branch_id is None:
            if source.branch_id is not None:
                raise InvalidCodeTreeError("Branch snapshots must be merged into Main")
            source.is_active = False
            base_main_code_id = None
        elif source.branch_id == target_branch_id:
            source.is_active = False
            base_main_code_id = source.base_main_code_id
        elif source.branch_id is None:
            base_main_code_id = source.id
        else:
            raise InvalidCodeTreeError("Snapshot belongs to a different branch")

        successor = self._clone(
            source,
            branch_id=target_branch_id,
            base_main_code_id=base_main_code_id,
            author_id=author_id,
            commit_message=commit_message,
            change_set_id=change_set_id,
            change_kind=change_kind,
            previous_code_id=source.id,
            changes=changes,
        )
        db.add(successor)
        db.flush()
        if source.branch_id == target_branch_id:
            self._move_object_handle(
                db, source_code_id=source.id, target_code_id=successor.id
            )
        return successor

    def _clone(
        self,
        source: CodeORM,
        *,
        branch_id: int | None,
        base_main_code_id: int | None,
        author_id: int | None,
        commit_message: str | None,
        change_set_id: UUID,
        change_kind: CodeChangeKind,
        previous_code_id: int | None,
        merged_from_code_id: int | None = None,
        changes: dict | None = None,
    ) -> CodeORM:
        values = {field: getattr(source, field) for field in self._payload_fields}
        values["is_deleted"] = source.is_deleted
        values.update(changes or {})
        return CodeORM(
            concept_id=source.concept_id,
            project_id=source.project_id,
            branch_id=branch_id,
            base_main_code_id=base_main_code_id,
            author_id=author_id,
            commit_message=commit_message,
            change_set_id=change_set_id,
            change_kind=change_kind.value,
            previous_code_id=previous_code_id,
            merged_from_code_id=merged_from_code_id,
            is_active=True,
            **values,
        )

    def _changed_fields(
        self, base: CodeORM | None, branch_code: CodeORM
    ) -> list[CodeChangedField]:
        fields = [
            CodeChangedField.NAME,
            CodeChangedField.COLOR,
            CodeChangedField.DESCRIPTION,
            CodeChangedField.PARENT_CONCEPT_ID,
            CodeChangedField.ENABLED,
            CodeChangedField.IS_DELETED,
        ]
        if base is None:
            return fields
        return [
            field
            for field in fields
            if getattr(base, field.value) != getattr(branch_code, field.value)
        ]

    def _move_object_handle(
        self, db: Session, *, source_code_id: int, target_code_id: int
    ) -> None:
        db.query(ObjectHandleORM).filter(
            ObjectHandleORM.code_id == source_code_id
        ).update({ObjectHandleORM.code_id: target_code_id}, synchronize_session=False)

    def _validate_parent(
        self,
        *,
        visible: dict[UUID, CodeORM],
        concept_id: UUID | None,
        parent_concept_id: UUID | None,
    ) -> None:
        if parent_concept_id is None:
            return
        if parent_concept_id not in visible:
            raise InvalidCodeTreeError("Parent concept is not visible in this scope")
        cursor = parent_concept_id
        visited: set[UUID] = set()
        while cursor is not None:
            if cursor == concept_id:
                raise InvalidCodeTreeError("A code cannot be its own ancestor")
            if cursor in visited:
                raise InvalidCodeTreeError("Code hierarchy contains a cycle")
            visited.add(cursor)
            parent = visible.get(cursor)
            cursor = parent.parent_concept_id if parent is not None else None

    def _validate_tree(self, visible: dict[UUID, CodeORM]) -> None:
        for concept_id, code in visible.items():
            self._validate_parent(
                visible=visible,
                concept_id=concept_id,
                parent_concept_id=code.parent_concept_id,
            )

    def _subtree(
        self, root: CodeORM, children_by_parent: dict[UUID, list[CodeORM]]
    ) -> list[CodeORM]:
        result = [root]
        for child in children_by_parent.get(root.concept_id, []):
            result.extend(self._subtree(child, children_by_parent))
        return result


code_service = CodeService()
