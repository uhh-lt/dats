"""The store of the artefacts kept as annotations of the system user: the span or
bbox annotations with the codes of some system code trees, which the artefact
declares and the set up creates, and for spans the span groups of a name."""

from abc import ABC
from collections.abc import Sequence
from typing import ClassVar

from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import BBoxAnnotationCreateIntern
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.code.system_codes import SystemCode, declared_codes
from core.user.user_crud import SYSTEM_USER_ID
from systems.artefact_system.artefact_exceptions import ForeignArtefactDataError
from systems.artefact_system.artefact_registry import ArtefactStore


class SystemAnnotations(ArtefactStore, ABC):
    """The system user's annotations of one kind with the codes of some code
    trees."""

    _kind: ClassVar[str]

    def __init__(self, *codes: SystemCode) -> None:
        self._codes = codes
        self._code_names = frozenset(declared_codes(codes))

    @property
    def codes(self) -> tuple[SystemCode, ...]:
        return self._codes

    def owned(self) -> frozenset[str]:
        return frozenset(
            f"{self._kind} annotations of the system user with the code '{name}'"
            for name in self._code_names
        )

    def code_ids(self, db: Session, *, project_id: int) -> dict[str, int]:
        """The ids of the store's codes in the project, by name."""
        ids = {
            code.name: code.id
            for code in crud_code.read_system_codes_by_project(
                db=db, project_id=project_id
            )
            if code.name in self._code_names
        }
        assert len(ids) == len(self._code_names), (
            f"Project {project_id} lacks the system codes "
            f"{sorted(self._code_names - set(ids))}: the set up did not run!"
        )
        return ids

    def annotation_document_id(self, db: Session, *, sdoc_id: int) -> int:
        """The system user's annotation document of the document, created if it
        has none."""
        return crud_adoc.exists_or_create(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=sdoc_id
        ).id

    def _check(
        self,
        annotations: Sequence[SpanAnnotationCreateIntern | BBoxAnnotationCreateIntern],
        adoc_id: int,
        code_ids: dict[str, int],
    ) -> None:
        own = set(code_ids.values())
        foreign = sorted(
            {
                f"{self._kind} annotation with the code id {a.code_id} in the "
                f"annotation document {a.annotation_document_id}"
                for a in annotations
                if a.annotation_document_id != adoc_id or a.code_id not in own
            }
        )
        if foreign:
            raise ForeignArtefactDataError(foreign)


class SystemSpans(SystemAnnotations):
    """The system user's span annotations with the codes of some code trees, in
    span groups of the name `group` if given."""

    _kind = "span"

    def __init__(self, *codes: SystemCode, group: str | None = None) -> None:
        super().__init__(*codes)
        self.group = group

    def owned(self) -> frozenset[str]:
        if self.group is None:
            return super().owned()
        return super().owned() | {f"span group '{self.group}' of the system user"}

    def replace(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        spans: list[SpanAnnotationCreateIntern],
    ) -> None:
        """Replace the store's spans of the document with these."""
        adoc_id = self.annotation_document_id(db=db, sdoc_id=sdoc_id)
        code_ids = self.code_ids(db=db, project_id=project_id)
        self._check(spans, adoc_id, code_ids)
        crud_span_anno.delete_by_adoc_and_codes(
            db=db, adoc_id=adoc_id, code_ids=list(code_ids.values())
        )
        crud_span_anno.create_multi(db=db, create_dtos=spans)

    def replace_groups(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        groups: list[list[SpanAnnotationCreateIntern]],
    ) -> None:
        """Replace the store's spans and span groups of the document with these
        groups, one span group per inner list."""
        assert self.group is not None, "The store keeps no span groups!"
        SpanGroupService().replace_groups(
            db=db,
            annotation_document_id=self.annotation_document_id(db=db, sdoc_id=sdoc_id),
            name=self.group,
            code_ids=list(self.code_ids(db=db, project_id=project_id).values()),
            groups=groups,
        )

    def clear(self, db: Session, *, project_id: int, sdoc_id: int) -> None:
        """Remove the store's spans and span groups of the document; creates no
        annotation document."""
        adocs = crud_adoc.read_by_user_and_sdocs(
            db=db, user_id=SYSTEM_USER_ID, sdoc_ids=[sdoc_id]
        )
        if not adocs:
            return
        crud_span_anno.delete_by_adoc_and_codes(
            db=db,
            adoc_id=adocs[0].id,
            code_ids=list(self.code_ids(db=db, project_id=project_id).values()),
        )
        if self.group is not None:
            crud_span_group.delete_by_adoc_and_name(
                db=db, annotation_document_id=adocs[0].id, name=self.group
            )


class SystemBBoxes(SystemAnnotations):
    """The system user's bbox annotations with the codes of some code trees."""

    _kind = "bbox"

    def replace(
        self,
        db: Session,
        *,
        project_id: int,
        sdoc_id: int,
        bboxes: list[BBoxAnnotationCreateIntern],
    ) -> None:
        """Replace the store's bboxes of the document with these."""
        adoc_id = self.annotation_document_id(db=db, sdoc_id=sdoc_id)
        code_ids = self.code_ids(db=db, project_id=project_id)
        self._check(bboxes, adoc_id, code_ids)
        crud_bbox_anno.delete_by_adoc_and_codes(
            db=db, adoc_id=adoc_id, code_ids=list(code_ids.values())
        )
        crud_bbox_anno.create_multi(db=db, create_dtos=bboxes)
