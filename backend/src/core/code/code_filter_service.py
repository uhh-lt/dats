from dataclasses import dataclass
from urllib.parse import quote, unquote
from uuid import UUID

from fastapi import status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from common.exception_handler import exception_handler
from core.code.code_dto import CodeRead
from core.code.code_filter_dto import (
    CodeFilterConceptRead,
    CodeFilterReleaseTag,
    CodeFilterVersionRead,
    CodeFilterVersionSummary,
)
from core.code.code_orm import CodeORM
from core.code.code_service import code_service
from core.code.codebook_release_orm import (
    CodebookReleaseCodeORM,
    CodebookReleaseORM,
)

CODE_CONCEPT_FILTER_PREFIX = "code-concept"
CODE_SNAPSHOT_FILTER_PREFIX = "code-snapshot"
PORTABLE_CODE_CONCEPT_FILTER_PREFIX = "code-concept-name"
PORTABLE_CODE_SNAPSHOT_FILTER_PREFIX = "code-snapshot-name"


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidCodeFilterError(Exception):
    pass


@dataclass(frozen=True)
class CodeConceptFilterSelection:
    concept_id: UUID
    branch_id: int | None


def parse_code_concept_filter_value(
    value: str,
) -> CodeConceptFilterSelection | None:
    parts = value.split(":")
    if len(parts) < 3 or parts[0] != CODE_CONCEPT_FILTER_PREFIX:
        return None
    try:
        concept_id = UUID(parts[1])
        if parts[2] == "main" and len(parts) == 3:
            return CodeConceptFilterSelection(concept_id=concept_id, branch_id=None)
        if parts[2] == "branch" and len(parts) == 4:
            return CodeConceptFilterSelection(
                concept_id=concept_id, branch_id=int(parts[3])
            )
    except (ValueError, TypeError):
        pass
    raise InvalidCodeFilterError("Invalid code-concept filter value")


def parse_code_snapshot_filter_value(value: str) -> int | None:
    parts = value.split(":")
    if parts[0] != CODE_SNAPSHOT_FILTER_PREFIX:
        return None
    if len(parts) != 2:
        raise InvalidCodeFilterError("Invalid code-snapshot filter value")
    try:
        return int(parts[1])
    except ValueError as error:
        raise InvalidCodeFilterError("Invalid code-snapshot filter value") from error


def parse_portable_code_filter_value(value: str) -> tuple[str, str] | None:
    prefix, separator, encoded_name = value.partition(":")
    if prefix not in (
        PORTABLE_CODE_CONCEPT_FILTER_PREFIX,
        PORTABLE_CODE_SNAPSHOT_FILTER_PREFIX,
    ):
        return None
    if not separator or not encoded_name:
        raise InvalidCodeFilterError("Invalid portable code filter value")
    return prefix, unquote(encoded_name)


class CodeFilterService:
    def export_filter_value(self, db: Session, *, value: str) -> str:
        selection = parse_code_concept_filter_value(value)
        if selection is not None:
            exemplar = (
                db.query(CodeORM)
                .filter(CodeORM.concept_id == selection.concept_id)
                .first()
            )
            if exemplar is None:
                raise InvalidCodeFilterError("Code concept does not exist")
            current = self._current_code(
                db,
                project_id=exemplar.project_id,
                concept_id=selection.concept_id,
                branch_id=selection.branch_id,
            )
            return (
                f"{PORTABLE_CODE_CONCEPT_FILTER_PREFIX}:{quote(current.name, safe='')}"
            )

        snapshot_id = parse_code_snapshot_filter_value(value)
        if snapshot_id is None:
            raise InvalidCodeFilterError("Invalid code filter value")
        snapshot = db.query(CodeORM).filter(CodeORM.id == snapshot_id).first()
        if snapshot is None:
            raise InvalidCodeFilterError("Code snapshot does not exist")
        return f"{PORTABLE_CODE_SNAPSHOT_FILTER_PREFIX}:{quote(snapshot.name, safe='')}"

    def import_filter_value(self, db: Session, *, project_id: int, value: str) -> str:
        parsed = parse_portable_code_filter_value(value)
        if parsed is None:
            raise InvalidCodeFilterError("Invalid portable code filter value")
        prefix, name = parsed
        visible = code_service.read_visible_map(db, project_id=project_id)
        matches = [code for code in visible.values() if code.name == name]
        if len(matches) != 1:
            raise InvalidCodeFilterError(
                f"Expected exactly one Main code named '{name}'"
            )
        code = matches[0]
        if prefix == PORTABLE_CODE_CONCEPT_FILTER_PREFIX:
            return self.concept_filter_value(concept_id=code.concept_id, branch_id=None)
        return self.snapshot_filter_value(code.id)

    def list_concepts(
        self,
        db: Session,
        *,
        project_id: int,
        branch_id: int | None,
    ) -> list[CodeFilterConceptRead]:
        """Return logical concepts visible in one Main-plus-branch overlay.

        This deliberately returns the complete context in one request. A codebook
        tree is already loaded as a bounded unit throughout DATS, and local picker
        filtering avoids a request per keystroke. Each concept is represented by
        its current visible snapshot and carries historical search aliases.
        """
        visible = code_service.read_visible_map(
            db,
            project_id=project_id,
            branch_id=branch_id,
            include_deleted=True,
        )
        ordered = sorted(
            visible.values(),
            key=lambda code: (code.name.casefold(), str(code.concept_id)),
        )
        names_by_concept, descriptions_by_concept = self._historical_metadata(
            db,
            project_id=project_id,
            concept_ids=[code.concept_id for code in ordered],
            branch_id=branch_id,
        )
        return [
            CodeFilterConceptRead(
                concept_id=code.concept_id,
                current=CodeRead.model_validate(code),
                path=self._concept_path(code, visible),
                historical_names=[
                    name
                    for name in names_by_concept.get(code.concept_id, [])
                    if name != code.name
                ],
                historical_descriptions=[
                    description
                    for description in descriptions_by_concept.get(code.concept_id, [])
                    if description != code.description
                ],
                filter_value=self.concept_filter_value(
                    concept_id=code.concept_id, branch_id=branch_id
                ),
            )
            for code in ordered
        ]

    def version_summary(
        self,
        db: Session,
        *,
        project_id: int,
        concept_id: UUID,
        branch_id: int | None,
    ) -> CodeFilterVersionSummary:
        current = self._current_code(
            db,
            project_id=project_id,
            concept_id=concept_id,
            branch_id=branch_id,
        )
        versions = self._versions_query(
            db,
            project_id=project_id,
            concept_id=concept_id,
            branch_id=branch_id,
        ).all()
        releases_by_code = self._release_tags(
            db, project_id=project_id, concept_id=concept_id
        )
        by_id = {code.id: code for code in versions}
        released_ids = sorted(
            (code_id for code_id in releases_by_code if code_id in by_id),
            key=lambda code_id: (
                releases_by_code[code_id][0].created,
                code_id,
            ),
            reverse=True,
        )
        released = [
            self._version_read(
                by_id[code_id],
                current_id=current.id,
                releases=releases_by_code.get(code_id, []),
            )
            for code_id in released_ids
            if code_id != current.id
        ]
        excluded = {current.id, *released_ids}
        recent = [
            self._version_read(
                code,
                current_id=current.id,
                releases=releases_by_code.get(code.id, []),
            )
            for code in versions
            if code.id not in excluded
        ][:3]
        return CodeFilterVersionSummary(
            concept_id=concept_id,
            current=self._version_read(
                current,
                current_id=current.id,
                releases=releases_by_code.get(current.id, []),
            ),
            released=released,
            recent=recent,
            total=len(versions),
        )

    def list_versions(
        self,
        db: Session,
        *,
        project_id: int,
        concept_id: UUID,
        branch_id: int | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> tuple[int, list[CodeFilterVersionRead]]:
        current = self._current_code(
            db,
            project_id=project_id,
            concept_id=concept_id,
            branch_id=branch_id,
        )
        versions_query = self._versions_query(
            db,
            project_id=project_id,
            concept_id=concept_id,
            branch_id=branch_id,
        )
        normalized_query = query.strip() if query else ""
        if normalized_query:
            pattern = f"%{self._escape_like(normalized_query)}%"
            versions_query = versions_query.filter(
                or_(
                    CodeORM.name.ilike(pattern, escape="\\"),
                    CodeORM.description.ilike(pattern, escape="\\"),
                    CodeORM.commit_message.ilike(pattern, escape="\\"),
                )
            )
        total = versions_query.count()
        versions = versions_query.offset((page - 1) * page_size).limit(page_size).all()
        releases_by_code = self._release_tags(
            db,
            project_id=project_id,
            concept_id=concept_id,
            code_ids=[code.id for code in versions],
        )
        return total, [
            self._version_read(
                code,
                current_id=current.id,
                releases=releases_by_code.get(code.id, []),
            )
            for code in versions
        ]

    def resolve_concept_snapshot_ids(
        self,
        db: Session,
        *,
        selection: CodeConceptFilterSelection,
        include_descendants: bool,
    ) -> list[int]:
        exemplar = (
            db.query(CodeORM).filter(CodeORM.concept_id == selection.concept_id).first()
        )
        if exemplar is None:
            raise InvalidCodeFilterError("Code concept does not exist")
        visible = code_service.read_visible_map(
            db,
            project_id=exemplar.project_id,
            branch_id=selection.branch_id,
            include_deleted=True,
        )
        selected = visible.get(selection.concept_id)
        if selected is None:
            raise InvalidCodeFilterError(
                "Code concept is not visible in the selected codebook"
            )
        concepts = {selection.concept_id}
        if include_descendants:
            children_by_parent: dict[UUID, list[CodeORM]] = {}
            for code in visible.values():
                if code.parent_concept_id is not None:
                    children_by_parent.setdefault(code.parent_concept_id, []).append(
                        code
                    )
            concepts = {
                code.concept_id
                for code in code_service._subtree(selected, children_by_parent)
            }
        scope: list[ColumnElement[bool]] = [CodeORM.branch_id.is_(None)]
        if selection.branch_id is not None:
            scope.append(CodeORM.branch_id == selection.branch_id)
        return [
            row[0]
            for row in db.query(CodeORM.id)
            .filter(
                CodeORM.project_id == exemplar.project_id,
                CodeORM.concept_id.in_(concepts),
                or_(*scope),
            )
            .all()
        ]

    @staticmethod
    def concept_filter_value(*, concept_id: UUID, branch_id: int | None) -> str:
        scope = "main" if branch_id is None else f"branch:{branch_id}"
        return f"{CODE_CONCEPT_FILTER_PREFIX}:{concept_id}:{scope}"

    @staticmethod
    def snapshot_filter_value(code_id: int) -> str:
        return f"{CODE_SNAPSHOT_FILTER_PREFIX}:{code_id}"

    def _current_code(
        self,
        db: Session,
        *,
        project_id: int,
        concept_id: UUID,
        branch_id: int | None,
    ) -> CodeORM:
        visible = code_service.read_visible_map(
            db,
            project_id=project_id,
            branch_id=branch_id,
            include_deleted=True,
        )
        current = visible.get(concept_id)
        if current is None:
            raise InvalidCodeFilterError(
                "Code concept is not visible in the selected codebook"
            )
        return current

    def _versions_query(
        self,
        db: Session,
        *,
        project_id: int,
        concept_id: UUID,
        branch_id: int | None,
    ):
        scope: list[ColumnElement[bool]] = [CodeORM.branch_id.is_(None)]
        if branch_id is not None:
            scope.append(CodeORM.branch_id == branch_id)
        return (
            db.query(CodeORM)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.concept_id == concept_id,
                or_(*scope),
            )
            .order_by(CodeORM.created.desc(), CodeORM.id.desc())
        )

    def _release_tags(
        self,
        db: Session,
        *,
        project_id: int,
        concept_id: UUID,
        code_ids: list[int] | None = None,
    ) -> dict[int, list[CodeFilterReleaseTag]]:
        query = (
            db.query(CodebookReleaseCodeORM.code_id, CodebookReleaseORM)
            .join(
                CodebookReleaseORM,
                CodebookReleaseORM.id == CodebookReleaseCodeORM.release_id,
            )
            .filter(
                CodebookReleaseORM.project_id == project_id,
                CodebookReleaseCodeORM.concept_id == concept_id,
            )
        )
        if code_ids is not None:
            query = query.filter(CodebookReleaseCodeORM.code_id.in_(code_ids))
        rows = query.order_by(
            CodebookReleaseORM.created.desc(), CodebookReleaseORM.id.desc()
        ).all()
        result: dict[int, list[CodeFilterReleaseTag]] = {}
        for code_id, release in rows:
            result.setdefault(code_id, []).append(
                CodeFilterReleaseTag(
                    id=release.id,
                    version=release.version,
                    created=release.created,
                )
            )
        return result

    def _historical_metadata(
        self,
        db: Session,
        *,
        project_id: int,
        concept_ids: list[UUID],
        branch_id: int | None,
    ) -> tuple[dict[UUID, list[str]], dict[UUID, list[str]]]:
        if not concept_ids:
            return {}, {}
        scope: list[ColumnElement[bool]] = [CodeORM.branch_id.is_(None)]
        if branch_id is not None:
            scope.append(CodeORM.branch_id == branch_id)
        rows = (
            db.query(CodeORM.concept_id, CodeORM.name, CodeORM.description)
            .filter(
                CodeORM.project_id == project_id,
                CodeORM.concept_id.in_(concept_ids),
                or_(*scope),
            )
            .order_by(CodeORM.created.desc(), CodeORM.id.desc())
            .all()
        )
        names_by_concept: dict[UUID, list[str]] = {}
        descriptions_by_concept: dict[UUID, list[str]] = {}
        for concept_id, name, description in rows:
            names = names_by_concept.setdefault(concept_id, [])
            if name not in names:
                names.append(name)
            if description:
                descriptions = descriptions_by_concept.setdefault(concept_id, [])
                if description not in descriptions:
                    descriptions.append(description)
        return names_by_concept, descriptions_by_concept

    def _concept_path(self, code: CodeORM, visible: dict[UUID, CodeORM]) -> list[str]:
        path = [code.name]
        visited = {code.concept_id}
        parent_id = code.parent_concept_id
        while parent_id is not None and parent_id not in visited:
            visited.add(parent_id)
            parent = visible.get(parent_id)
            if parent is None:
                break
            path.append(parent.name)
            parent_id = parent.parent_concept_id
        return list(reversed(path))

    def _version_read(
        self,
        code: CodeORM,
        *,
        current_id: int,
        releases: list[CodeFilterReleaseTag],
    ) -> CodeFilterVersionRead:
        return CodeFilterVersionRead(
            code=CodeRead.model_validate(code),
            is_current=code.id == current_id,
            releases=releases,
            filter_value=self.snapshot_filter_value(code.id),
        )

    @staticmethod
    def _escape_like(value: str) -> str:
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


code_filter_service = CodeFilterService()
