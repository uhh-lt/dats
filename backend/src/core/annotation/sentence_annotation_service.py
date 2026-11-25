from uuid import uuid4

from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_source_utils import (
    copy_annotation_source_memos,
    read_annotation_sources,
)
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationCreateIntern,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
    SentenceAnnotatorResult,
)
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.doc.source_document_data_crud import crud_sdoc_data
from core.memo.memo_enum import AttachedObjectType
from repos.db.sql_exceptions import NoSuchElementError
from repos.db.sql_utils import assert_in_project


class SentenceAnnotationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(SentenceAnnotationService, cls).__new__(cls)

    def create(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        create_dto: SentenceAnnotationCreate,
    ) -> SentenceAnnotationRead:
        """
        Like `create_multi`, for one annotation.

        Raises:
            NoSuchElementError: If the annotation is a copy of an annotation that does
                not exist.
        """
        results = self.create_multi(
            db=db, project_id=project_id, user_id=user_id, create_dtos=[create_dto]
        )
        if not results:
            # the copy was skipped because its source annotation does not exist
            raise NoSuchElementError(
                SentenceAnnotationORM,
                project_id=project_id,
                id=create_dto.source_annotation_id,
            )
        return results[0]

    def create_multi(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        create_dtos: list[SentenceAnnotationCreate],
    ) -> list[SentenceAnnotationRead]:
        """
        Create sentence annotations of a user, creating missing annotation documents.

        An annotation with a `source_annotation_id` is a copy of another annotation
        (e.g. accepted in the annotation comparison): it records the user and code
        of its source as provenance and gets copies of the source's memos (by their
        original authors). A copy whose source annotation no longer exists is
        skipped silently, the others are still created. Everything runs in a
        constant number of queries.

        Args:
            project_id: The project of the annotations.
            user_id: The user the annotations belong to.
            create_dtos: The annotations to create.

        Returns:
            The created annotations, in the order of `create_dtos`, without the
            skipped copies.

        Raises:
            AnnotationSourceError: If a source annotation does not annotate the same
                source document of the same project.
        """
        if not create_dtos:
            return []

        # 1) read the annotations that are copied, skipping copies of deleted ones
        annotations = read_annotation_sources(
            db=db,
            crud=crud_sentence_anno,
            project_id=project_id,
            create_dtos=create_dtos,
        )

        # 2) find or create the user's annotation document of every source document
        adoc_by_sdoc_id = crud_adoc.exists_or_create_multi(
            db=db,
            user_id=user_id,
            sdoc_ids=list(
                dict.fromkeys(create_dto.sdoc_id for create_dto, _ in annotations)
            ),
        )

        # 3) create the annotations, with the provenance of the copies
        db_objs = crud_sentence_anno.create_multi(
            db=db,
            project_id=project_id,
            create_dtos=[
                SentenceAnnotationCreateIntern(
                    uuid=str(uuid4()),
                    sentence_id_start=create_dto.sentence_id_start,
                    sentence_id_end=create_dto.sentence_id_end,
                    code_id=create_dto.code_id,
                    annotation_document_id=adoc_by_sdoc_id[create_dto.sdoc_id].id,
                    source_annotation_id=source.id if source else None,
                    source_user_id=source.user_id if source else None,
                    source_code_id=source.code_id if source else None,
                )
                for create_dto, source in annotations
            ],
        )

        # 4) copy the memos of the source annotations onto their copies
        copy_annotation_source_memos(
            db=db,
            attached_object_type=AttachedObjectType.sentence_annotation,
            sources=[source for _, source in annotations],
            copies=db_objs,
        )

        # 5) read them back with their relationships for the DTOs
        return self._to_read_dtos(
            db=db, project_id=project_id, ids=[db_obj.id for db_obj in db_objs]
        )

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        update_dtos: list[SentenceAnnotationUpdateBulk],
    ) -> list[SentenceAnnotationRead]:
        """
        Change the code of sentence annotations, each identified by its id.

        Args:
            project_id: The project of the annotations.
            update_dtos: The annotations to update. Must not repeat an id.

        Returns:
            The updated annotations, in the order of `update_dtos`.
        """
        db_objs = crud_sentence_anno.update_multi(
            db=db,
            project_id=project_id,
            ids=[update_dto.sentence_annotation_id for update_dto in update_dtos],
            update_dtos=[
                SentenceAnnotationUpdate(code_id=update_dto.code_id)
                for update_dto in update_dtos
            ],
        )
        return self._to_read_dtos(
            db=db, project_id=project_id, ids=[db_obj.id for db_obj in db_objs]
        )

    def update(
        self,
        db: Session,
        *,
        project_id: int,
        id: int,
        update_dto: SentenceAnnotationUpdate,
    ) -> SentenceAnnotationRead:
        """
        Update an annotation of the project.

        Returns:
            The updated annotation.
        """
        db_obj = crud_sentence_anno.update(
            db=db, project_id=project_id, id=id, update_dto=update_dto
        )
        return self._to_read_dtos(db=db, project_id=project_id, ids=[db_obj.id])[0]

    def read_by_sentence(
        self, db: Session, *, project_id: int, user_id: int, sdoc_id: int
    ) -> SentenceAnnotatorResult:
        """
        Read the sentence annotations of a user in a text document, grouped by the
        sentences they cover.

        Args:
            project_id: The project of the document.
            user_id: The user the annotations belong to.
            sdoc_id: The text document.

        Returns:
            Every sentence index of the document, mapped to the annotations that
            cover it (an annotation of several sentences is listed at each).

        Raises:
            NoSuchElementError: If the document has no text data in the project.
        """
        # 1) the sentences of the document
        sdoc_data = crud_sdoc_data.read(db=db, id=sdoc_id)
        assert_in_project([sdoc_data], project_id=project_id)
        result: dict[int, list[SentenceAnnotationRead]] = {
            idx: [] for idx in range(len(sdoc_data.sentences))
        }

        # 2) list every annotation at each sentence it covers
        for db_obj in crud_sentence_anno.read_by_user(
            db=db, project_id=project_id, user_id=user_id, sdoc_id=sdoc_id
        ):
            sent_anno = SentenceAnnotationRead.model_validate(db_obj)
            for sent_idx in range(
                sent_anno.sentence_id_start, sent_anno.sentence_id_end + 1
            ):
                if sent_idx not in result:
                    logger.warning(
                        f"Invalid sentence index {sent_idx} for sdoc {sdoc_id}"
                    )
                    continue
                result[sent_idx].append(sent_anno)

        return SentenceAnnotatorResult(sentence_annotations=result)

    def delete_multi(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[SentenceAnnotationRead]:
        """
        Delete sentence annotations.

        Args:
            project_id: The project of the annotations.
            ids: The annotations to delete.

        Returns:
            The deleted annotations as they were before the deletion, in the order
            of `ids`.
        """
        # 1) snapshot the annotations before they are deleted
        deleted = [
            SentenceAnnotationRead.model_validate(db_obj)
            for db_obj in crud_sentence_anno.read_by_ids(
                db=db, project_id=project_id, ids=ids
            )
        ]

        # 2) delete them
        crud_sentence_anno.delete_multi(db=db, project_id=project_id, ids=ids)

        return deleted

    def _to_read_dtos(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[SentenceAnnotationRead]:
        """Read DTOs of the given annotations, re-read with eager loading."""
        return [
            SentenceAnnotationRead.model_validate(db_obj)
            for db_obj in crud_sentence_anno.read_by_ids(
                db=db, project_id=project_id, ids=ids
            )
        ]
