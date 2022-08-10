from pydantic import root_validator


class UpdateDTOBase:
    # noinspection PyMethodParameters
    @root_validator
    def check_at_least_one_not_null(cls, values):
        for val in values:
            if val:
                return values
        raise ValueError("At least one of the fields to update has to be not null!")
