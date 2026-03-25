import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { ContentLayout } from "@components/content-layouts";
import { MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { Box } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";
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

  // track searchFilter changes to reset dependent redux state on filter change
  const previousFilterRef = useRef(searchFilter);
  useEffect(() => {
    if (previousFilterRef.current === searchFilter) return;
    previousFilterRef.current = searchFilter;
    dispatch(WordFrequencyActions.onSearchParamsChange());
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
