import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { ContentLayout } from "@components/content-layouts";
import { ColumnInfo, MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { Box } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  wordFrequencyTableInfoQueryOptions,
  wordFrequencyTableQueryOptions,
} from "../../_api/wordFrequencyAnalysisQueryOptions";
import { WordFrequencyActions } from "../../store/wordFrequencySlice";
import { WordFrequencyTable } from "./_components/WordFrequencyTable";
import { WordFrequencyRouteAPI } from "./_hooks/wordFrequencyRouteAPI";

const fetchSize = 20;

export function WordFrequencyView() {
  const dispatch = useAppDispatch();
  const projectId = WordFrequencyRouteAPI.useParams({ select: (params) => params.projectId });
  const { sortingModel, searchFilter } = WordFrequencyRouteAPI.useSearch();

  const filter = useMemo(
    () => deserializeFilterFromSearchParam(searchFilter, "root") as MyFilter<WordFrequencyColumns>,
    [searchFilter],
  );

  const { data: tableInfo } = useSuspenseQuery(wordFrequencyTableInfoQueryOptions(projectId));

  const columnInfoMap = useMemo(
    () =>
      (tableInfo || []).reduce(
        (acc, info) => {
          acc[info.column] = info;
          return acc;
        },
        {} as Record<string, ColumnInfo>,
      ),
    [tableInfo],
  );

  // initialize column info in redux for use in filter dialog and other places
  useEffect(() => {
    if (!tableInfo || tableInfo.length === 0) return;
    dispatch(WordFrequencyActions.init({ columnInfoMap }));
  }, [columnInfoMap, dispatch, tableInfo]);

  // track searchFilter changes to reset dependent redux state on filter change
  const previousFilterRef = useRef(searchFilter);
  useEffect(() => {
    if (previousFilterRef.current === searchFilter) return;
    previousFilterRef.current = searchFilter;
    dispatch(WordFrequencyActions.onURLFilterChange());
  }, [dispatch, searchFilter]);

  const wordFrequencyQuery = useSuspenseInfiniteQuery(
    wordFrequencyTableQueryOptions({
      projectId,
      filter,
      sortingModel,
      pageSize: fetchSize,
    }),
  );

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <WordFrequencyTable
          projectId={projectId}
          tableInfo={tableInfo}
          searchData={wordFrequencyQuery.data}
          isError={wordFrequencyQuery.isError}
          isFetching={wordFrequencyQuery.isFetching}
          isLoading={false}
          onFetchNextPage={() => {
            void wordFrequencyQuery.fetchNextPage();
          }}
          filter={filter}
        />
      </Box>
    </ContentLayout>
  );
}
