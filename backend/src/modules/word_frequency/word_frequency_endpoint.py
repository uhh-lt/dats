from common.dependencies import DBSession
from common.project_router import project_router
from modules.word_frequency.word_frequency_columns import WordFrequencyColumns
from modules.word_frequency.word_frequency_dto import WordFrequencyResult
from modules.word_frequency.word_frequency_feature import WORD_FREQUENCY
from modules.word_frequency.word_frequency_service import WordFrequencyService
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort

router = project_router(
    "/word-frequencies", tags=["wordFrequency"], feature=WORD_FREQUENCY
)


# --- read operations


@router.get(
    "/info",
    response_model=list[ColumnInfo[WordFrequencyColumns]],
    summary="Returns WordFrequency Info.",
)
def word_frequency_analysis_info(
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
    "/analysis",
    response_model=WordFrequencyResult,
    summary="Perform word frequency analysis.",
)
def word_frequency_analysis(
    *,
    db: DBSession,
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    page: int,
    page_size: int,
    sorts: list[Sort[WordFrequencyColumns]],
) -> WordFrequencyResult:

    return WordFrequencyService().word_frequency(
        db=db,
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/export",
    response_model=str,
    summary="Export the word frequency analysis.",
)
def word_frequency_analysis_export(
    *,
    db: DBSession,
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    sorts: list[Sort[WordFrequencyColumns]],
) -> str:

    return WordFrequencyService().word_frequency_export(
        db=db,
        project_id=project_id,
        filter=filter,
    )
