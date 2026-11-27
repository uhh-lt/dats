from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from modules.classifier.classifier_dto import (
    ClassifierCreate,
    ClassifierEvaluationCreate,
    ClassifierUpdate,
)
from modules.classifier.classifier_orm import (
    ClassifierCodeLinkTable,
    ClassifierEvaluationORM,
    ClassifierORM,
    ClassifierTagLinkTable,
)
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDClassifier(
    ProjectCRUDBase[ClassifierORM, ClassifierCreate, ClassifierUpdate]
):
    ### CREATE OPERATIONS ###

    def create_evaluation(
        self, db: Session, *, project_id: int, create_dto: ClassifierEvaluationCreate
    ) -> ClassifierORM:
        """
        Create an evaluation of a classifier of the project.

        Args:
            project_id: The project of the classifier.
            create_dto: The evaluation.

        Returns:
            The classifier with its evaluations.
        """
        classifier = self.read(
            db=db, project_id=project_id, id=create_dto.classifier_id
        )
        db.add(
            ClassifierEvaluationORM(**create_dto.model_dump(), project_id=project_id)
        )
        db.flush()
        db.refresh(classifier)
        return classifier

    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[ClassifierORM]:
        """
        Read all classifiers of a project.

        Args:
            project_id: The ID of the project.

        Returns:
            The classifiers of the project, ordered by id.
        """
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .order_by(self.model.id)
            .all()
        )

    ### OTHER OPERATIONS ###

    def link_codes(
        self, db: Session, *, project_id: int, id: int, code_ids: list[int]
    ) -> ClassifierORM:
        """Link codes to a classifier; already linked codes are skipped."""
        return self._link(
            db=db,
            project_id=project_id,
            id=id,
            link_table=ClassifierCodeLinkTable,
            key="code_id",
            ids=code_ids,
        )

    def link_tags(
        self, db: Session, *, project_id: int, id: int, tag_ids: list[int]
    ) -> ClassifierORM:
        """Link tags to a classifier; already linked tags are skipped."""
        return self._link(
            db=db,
            project_id=project_id,
            id=id,
            link_table=ClassifierTagLinkTable,
            key="tag_id",
            ids=tag_ids,
        )

    def _link(
        self,
        db: Session,
        *,
        project_id: int,
        id: int,
        link_table: type[ClassifierCodeLinkTable] | type[ClassifierTagLinkTable],
        key: str,
        ids: list[int],
    ) -> ClassifierORM:
        classifier = self.read(db=db, project_id=project_id, id=id)
        if not ids:
            return classifier

        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db.execute(
                insert(link_table).on_conflict_do_nothing(),
                [
                    {
                        "project_id": project_id,
                        "classifier_id": id,
                        key: link_id,
                    }
                    for link_id in batch_ids
                ],
            )
        db.flush()

        # the loaded relationships do not know the new links yet
        db.expire(classifier, ["codes", "tags"])
        return classifier


crud_classifier = CRUDClassifier(ClassifierORM)
