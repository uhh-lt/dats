from typing import List, Optional, Tuple

from fastapi import Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.crud import Crud
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.orm.orm_base import ORMBase
from app.core.data.orm.util import get_parent_project_id


class InvalidError(Exception):
    def __init__(self, note=None):
        note_description = f": {note}" if note is not None else ""
        super().__init__(f"Invalid Request{note_description}")


class Validate:
    db: Session

    def __init__(
        self,
        db: Session = Depends(get_db_session),
    ):
        self.db = db

    def validate_objects_in_same_project(self, specs: List[Tuple[Crud, int | str]]):
        orms = [self.read_crud(spec[0], spec[1]) for spec in specs]

        project_ids = {get_parent_project_id(orm) for orm in orms}

        if None in project_ids:
            raise InvalidError("Object has no parent project")

        self.validate_condition(
            len(project_ids) == 1,
            "Objects need to be in the same project",
        )

    def validate_condition(self, condition: bool, note: Optional[str] = None):
        if not condition:
            raise InvalidError(note)

    def read_crud(self, crud: Crud, id: int | str) -> ORMBase:
        try:
            # Some read functions take an int, others take a str
            # (e.g. PreprocessingJobs).
            # There's no good way to bind the value of `Crud` to the
            # type of `object_id`, so we switch off the type checker
            # for this line :(
            return crud.value.read(self.db, id)  # type: ignore
        except NoSuchElementError:
            raise InvalidError("Object does not exist")
