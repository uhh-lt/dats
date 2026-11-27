from common.dependencies import DBSession
from common.project_router import project_router
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_dto import (
    WordFrequencyExportRequest,
    WordFrequencyResult,
    WordFrequencySearchRequest,
)
from modules.word_frequency.word_frequency_feature import WORD_FREQUENCY
from modules.word_frequency.word_frequency_service import WordFrequencyService
from systems.search_system.column_info import ColumnInfo

router = project_router(
    "/word-frequencies", tags=["wordFrequencies"], feature=WORD_FREQUENCY
)


# --- read operations


@router.get(
    "/columns",
    response_model=list[ColumnInfo[WordFrequencyColumns]],
    summary="Returns WordFrequency Info.",
)
def get_columns(
    *,
    db: DBSession,
    project_id: int,
) -> list[ColumnInfo[WordFrequencyColumns]]:

    return WordFrequencyService().word_frequency_info(
        db=db,
        project_id=project_id,
    )


# --- other operations


@router.post(
    "",
    response_model=WordFrequencyResult,
    summary="Perform word frequency analysis.",
)
def compute_word_frequencies(
    *,
    db: DBSession,
    project_id: int,
    request: WordFrequencySearchRequest,
) -> WordFrequencyResult:

    return WordFrequencyService().word_frequency(
        db=db,
        project_id=project_id,
        filter=request.filter,
        page=request.page_number,
        page_size=request.page_size,
        sorts=request.sorts,
    )


@router.post(
    "/export",
    response_model=str,
    summary="Export the word frequency analysis.",
)
def export(
    *,
    db: DBSession,
    project_id: int,
    request: WordFrequencyExportRequest,
) -> str:

    return WordFrequencyService().word_frequency_export(
        db=db,
        project_id=project_id,
        filter=request.filter,
    )
