import { ContentLayout } from "@components/content-layouts";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { Box } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { wordFrequencyTableQueryOptions } from "../../_api/wordFrequencyAnalysisQueryOptions";
import { WordFrequencyActions } from "../../store/wordFrequencySlice";
import { WordFrequencyTable } from "./_components/WordFrequencyTable";
import { WordFrequencyRouteAPI } from "./_hooks/wordFrequencyRouteAPI";

export function WordFrequencyView() {
  // search word frequency feature
  const projectId = WordFrequencyRouteAPI.useParams({ select: (params) => params.projectId });
  const { sortingModel, searchFilter: filter, fetchSize } = WordFrequencyRouteAPI.useSearch();
  const wordFrequencyQuery = useSuspenseInfiniteQuery(
    wordFrequencyTableQueryOptions({
      projectId,
      filter,
      sortingModel,
      fetchSize,
    }),
  );
  // resetting search-parameter-dependant state
  const dispatch = useAppDispatch();
  useResetStateOnSearch([projectId, filter, sortingModel], () => dispatch(WordFrequencyActions.onSearchParamsChange()));

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
