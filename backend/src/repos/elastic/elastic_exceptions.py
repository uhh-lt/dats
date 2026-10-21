from common.common_exceptions import NotFoundError


class NoSuchObjectInElasticSearchError(NotFoundError):
    def __init__(self, index_name: str, id: int):
        super().__init__(
            (f"There exists no Object with ID={id} in Index {index_name} ")
        )
