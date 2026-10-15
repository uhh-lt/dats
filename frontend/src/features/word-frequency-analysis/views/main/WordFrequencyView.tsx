import { ContentLayout } from "@components/content-layouts";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { Box } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { WordFrequencyActions } from "../../store/wordFrequencySlice";
import { WordFrequencyTable } from "./_components/WordFrequencyTable";
import { WordFrequencyRouteAPI } from "./_hooks/wordFrequencyRouteAPI";

export function WordFrequencyView() {
  // search word frequency feature
  const projectId = WordFrequencyRouteAPI.useParams({ select: (params) => params.projectId });
  const { sortingModel, searchFilter: filter } = WordFrequencyRouteAPI.useSearch();
  const { wordFrequencyTableOptions } = WordFrequencyRouteAPI.useRouteContext();
  const wordFrequencyQuery = useSuspenseInfiniteQuery(wordFrequencyTableOptions);
  // resetting search-parameter-dependant state
  const dispatch = useAppDispatch();
  const resetState = useCallback(() => {
    dispatch(WordFrequencyActions.onSearchParamsChange());
  }, [dispatch]);
  useResetStateOnSearch([projectId, filter, sortingModel], resetState);

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
