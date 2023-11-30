from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.word_frequency import WordFrequencyCreate
from app.core.data.orm.word_frequency import WordFrequencyORM


class CrudWordFrequency(
    CRUDBase[
        WordFrequencyORM,
        WordFrequencyCreate,
        None,
    ]
):
    pass


crud_word_frequency = CrudWordFrequency(WordFrequencyORM)
