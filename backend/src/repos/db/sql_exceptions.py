from common.common_exceptions import NotFoundError
from repos.db.orm_base import ORMBase


class NoSuchElementError(NotFoundError):
    def __init__(self, model: type[ORMBase], **kwargs):
        self.model = model
        self.model_name = model.__name__.replace("ORM", "")
        super().__init__(f"There exists no {self.model_name} with: {kwargs} !")
