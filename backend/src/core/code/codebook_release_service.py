from fastapi import status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, aliased

from common.exception_handler import exception_handler
from core.code.code_dto import CodeChangedField, CodeRead
from core.code.code_orm import CodeORM
from core.code.codebook_release_dto import (
    CodebookReleaseChangeType,
    CodebookReleaseComparisonChange,
    CodebookReleaseComparisonRead,
    CodebookReleaseCreate,
    CodebookReleaseRead,
    CodebookReleaseTreeRead,
)
from core.code.codebook_release_orm import (
    CodebookReleaseCodeORM,
    CodebookReleaseORM,
)
from repos.db.crud_base import NoSuchElementError


@exception_handler(status.HTTP_409_CONFLICT)
class CodebookReleaseConflictError(Exception):
    pass


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidCodebookReleaseError(Exception):
    pass


class CodebookReleaseService:
    _changed_fields = [
        CodeChangedField.NAME,
        CodeChangedField.COLOR,
        CodeChangedField.DESCRIPTION,
        CodeChangedField.PARENT_CONCEPT_ID,
        CodeChangedField.ENABLED,
        CodeChangedField.IS_DELETED,
    ]

    def create(
        self, db: Session, *, create_dto: CodebookReleaseCreate
    ) -> CodebookReleaseTreeRead:
        """Atomically pin the current non-system Main tree to an immutable release."""
        existing = (
            db.query(CodebookReleaseORM.id)
            .filter(
                CodebookReleaseORM.project_id == create_dto.project_id,
                CodebookReleaseORM.version == create_dto.version,
            )
            .first()
        )
        if existing is not None:
            raise CodebookReleaseConflictError(
                f"Codebook release {create_dto.version} already exists"
            )

        codes = self._read_latest_main(db, project_id=create_dto.project_id)
        release = CodebookReleaseORM(
            project_id=create_dto.project_id,
            version=create_dto.version,
            description=create_dto.description,
        )
        db.add(release)
        db.flush()
        db.add_all(
            [
                CodebookReleaseCodeORM(
                    release_id=release.id,
                    concept_id=code.concept_id,
                    code_id=code.id,
                )
                for code in codes
            ]
        )
        db.flush()
        return CodebookReleaseTreeRead(
            release=self._to_read(
                release,
                code_count=len(codes),
                previous_release_id=self._previous_release_id(db, release=release),
            ),
            codes=[CodeRead.model_validate(code) for code in codes],
        )

    def list_by_project(
        self,
        db: Session,
        *,
        project_id: int,
        page: int,
        page_size: int,
        query: str | None = None,
    ) -> tuple[int, list[CodebookReleaseRead]]:
        filters = [CodebookReleaseORM.project_id == project_id]
        normalized_query = query.strip() if query else ""
        if normalized_query:
            escaped_query = (
                normalized_query.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            search_pattern = f"%{escaped_query}%"
            filters.append(
                or_(
                    CodebookReleaseORM.version.ilike(search_pattern, escape="\\"),
                    CodebookReleaseORM.description.ilike(search_pattern, escape="\\"),
                )
            )

        code_count = (
            select(func.count(CodebookReleaseCodeORM.code_id))
            .where(CodebookReleaseCodeORM.release_id == CodebookReleaseORM.id)
            .correlate(CodebookReleaseORM)
            .scalar_subquery()
        )
        previous_release = aliased(CodebookReleaseORM)
        previous_release_id = (
            select(previous_release.id)
            .where(
                previous_release.project_id == CodebookReleaseORM.project_id,
                or_(
                    previous_release.created < CodebookReleaseORM.created,
                    and_(
                        previous_release.created == CodebookReleaseORM.created,
                        previous_release.id < CodebookReleaseORM.id,
                    ),
                ),
            )
            .order_by(previous_release.created.desc(), previous_release.id.desc())
            .limit(1)
            .correlate(CodebookReleaseORM)
            .scalar_subquery()
        )
        total = (
            db.query(func.count(CodebookReleaseORM.id)).filter(*filters).scalar() or 0
        )
        rows = (
            db.query(
                CodebookReleaseORM,
                code_count.label("code_count"),
                previous_release_id.label("previous_release_id"),
            )
            .filter(*filters)
            .order_by(CodebookReleaseORM.created.desc(), CodebookReleaseORM.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return total, [
            self._to_read(
                release,
                code_count=count,
                previous_release_id=previous_id,
            )
            for release, count, previous_id in rows
        ]

    def read_tree(self, db: Session, *, release_id: int) -> CodebookReleaseTreeRead:
        release = self.read(db, release_id=release_id)
        codes = self._read_release_codes(db, release_id=release_id)
        return CodebookReleaseTreeRead(
            release=self._to_read(
                release,
                code_count=len(codes),
                previous_release_id=self._previous_release_id(db, release=release),
            ),
            codes=[CodeRead.model_validate(code) for code in codes],
        )

    def compare(
        self,
        db: Session,
        *,
        release_id: int,
        target_release_id: int | None,
    ) -> CodebookReleaseComparisonRead:
        base_release = self.read(db, release_id=release_id)
        base_codes = self._read_release_codes(db, release_id=release_id)

        target_release: CodebookReleaseORM | None = None
        if target_release_id is None:
            target_codes = self._read_latest_main(
                db, project_id=base_release.project_id
            )
        else:
            target_release = self.read(db, release_id=target_release_id)
            if target_release.project_id != base_release.project_id:
                raise InvalidCodebookReleaseError(
                    "Codebook releases belong to different projects"
                )
            target_codes = self._read_release_codes(db, release_id=target_release_id)

        before_by_concept = {code.concept_id: code for code in base_codes}
        after_by_concept = {code.concept_id: code for code in target_codes}
        changes: list[CodebookReleaseComparisonChange] = []
        unchanged_count = 0
        added_count = 0
        modified_count = 0
        removed_count = 0

        for concept_id in sorted(
            before_by_concept.keys() | after_by_concept.keys(), key=str
        ):
            before = before_by_concept.get(concept_id)
            after = after_by_concept.get(concept_id)
            if before is not None and after is not None and before.id == after.id:
                unchanged_count += 1
                continue
            if before is None and after is not None:
                change_type = CodebookReleaseChangeType.ADDED
                changed_fields = self._changed_fields
                added_count += 1
            elif before is not None and after is None:
                change_type = CodebookReleaseChangeType.REMOVED
                changed_fields = self._changed_fields
                removed_count += 1
            elif before is not None and after is not None:
                change_type = CodebookReleaseChangeType.MODIFIED
                changed_fields = self._diff_fields(before, after)
                modified_count += 1
            else:
                continue
            changes.append(
                CodebookReleaseComparisonChange(
                    concept_id=concept_id,
                    change_type=change_type,
                    before=(
                        CodeRead.model_validate(before) if before is not None else None
                    ),
                    after=(
                        CodeRead.model_validate(after) if after is not None else None
                    ),
                    changed_fields=changed_fields,
                )
            )

        return CodebookReleaseComparisonRead(
            base_release=self._to_read(
                base_release,
                code_count=len(base_codes),
                previous_release_id=self._previous_release_id(db, release=base_release),
            ),
            target_release=(
                self._to_read(
                    target_release,
                    code_count=len(target_codes),
                    previous_release_id=self._previous_release_id(
                        db, release=target_release
                    ),
                )
                if target_release is not None
                else None
            ),
            target_is_latest=target_release is None,
            added_count=added_count,
            modified_count=modified_count,
            removed_count=removed_count,
            unchanged_count=unchanged_count,
            changes=changes,
        )

    def read(self, db: Session, *, release_id: int) -> CodebookReleaseORM:
        release = (
            db.query(CodebookReleaseORM)
            .filter(CodebookReleaseORM.id == release_id)
            .first()
        )
        if release is None:
            raise NoSuchElementError(CodebookReleaseORM, id=release_id)
        return release

    def _read_latest_main(self, db: Session, *, project_id: int) -> list[CodeORM]:
        return (
            db.query(CodeORM)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.branch_id.is_(None),
                CodeORM.is_active == True,  # noqa: E712
                CodeORM.is_deleted == False,  # noqa: E712
                CodeORM.is_system == False,  # noqa: E712
            )
            .order_by(CodeORM.id)
            .all()
        )

    def _read_release_codes(self, db: Session, *, release_id: int) -> list[CodeORM]:
        return (
            db.query(CodeORM)
            .join(
                CodebookReleaseCodeORM,
                CodebookReleaseCodeORM.code_id == CodeORM.id,
            )
            .filter(
                CodebookReleaseCodeORM.release_id == release_id,
                CodeORM.is_system == False,  # noqa: E712
            )
            .order_by(CodeORM.id)
            .all()
        )

    def _diff_fields(self, before: CodeORM, after: CodeORM) -> list[CodeChangedField]:
        return [
            field
            for field in self._changed_fields
            if getattr(before, field.value) != getattr(after, field.value)
        ]

    def _to_read(
        self,
        release: CodebookReleaseORM,
        *,
        code_count: int,
        previous_release_id: int | None,
    ) -> CodebookReleaseRead:
        return CodebookReleaseRead(
            id=release.id,
            project_id=release.project_id,
            version=release.version,
            description=release.description,
            created=release.created,
            code_count=code_count,
            previous_release_id=previous_release_id,
        )

    def _previous_release_id(
        self, db: Session, *, release: CodebookReleaseORM
    ) -> int | None:
        row = (
            db.query(CodebookReleaseORM.id)
            .filter(
                CodebookReleaseORM.project_id == release.project_id,
                or_(
                    CodebookReleaseORM.created < release.created,
                    and_(
                        CodebookReleaseORM.created == release.created,
                        CodebookReleaseORM.id < release.id,
                    ),
                ),
            )
            .order_by(CodebookReleaseORM.created.desc(), CodebookReleaseORM.id.desc())
            .first()
        )
        return row[0] if row is not None else None


codebook_release_service = CodebookReleaseService()
