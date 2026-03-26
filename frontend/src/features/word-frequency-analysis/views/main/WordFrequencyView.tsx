import { WordFrequencyColumns } from "@api/models/WordFrequencyColumns";
import { ContentLayout } from "@components/content-layouts";
import { MyFilter, deserializeFilterFromSearchParam } from "@core/filter";
import { Box } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";
import { WordFrequencyActions } from "../../store/wordFrequencySlice";
import { WordFrequencyTable } from "./_components/WordFrequencyTable";
import { WordFrequencyRouteAPI } from "./_hooks/wordFrequencyRouteAPI";

export function WordFrequencyView() {
  // search word frequency feature
  const projectId = WordFrequencyRouteAPI.useParams({ select: (params) => params.projectId });
  const { sortingModel, searchFilter } = WordFrequencyRouteAPI.useSearch();
  const filter = useMemo(
    () => deserializeFilterFromSearchParam(searchFilter, "root") as MyFilter<WordFrequencyColumns>,
    [searchFilter],
  );
  const wordFrequencyQuery = useSuspenseInfiniteQuery(
    wordFrequencyTableQueryOptions({
      projectId,
      filter,
      sortingModel,
    }),
  );

  // resetting search-parameter-dependant state
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(WordFrequencyActions.onSearchParamsChange());
  }, [projectId, filter, sortingModel, dispatch]);

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <WordFrequencyTable
          projectId={projectId}
          searchData={wordFrequencyQuery.data}
          isError={wordFrequencyQuery.isError}
          isFetching={wordFrequencyQuery.isFetching}
          isLoading={wordFrequencyQuery.isLoading}
          onFetchNextPage={() => {
            void wordFrequencyQuery.fetchNextPage();
          }}
          filter={filter}
        />
      </Box>
    </ContentLayout>
  );
}
