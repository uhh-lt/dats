import { MyFilter, createEmptyFilter } from "@components/filter/redux-filter-dialog/index";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { MetadataHooks } from "../../../../api/MetadataHooks";
import { SdocColumns } from "../../../../api/openapi/models/SdocColumns";
import { SimSearchSentenceHit } from "../../../../api/openapi/models/SimSearchSentenceHit";
import { SpanEntityStat } from "../../../../api/openapi/models/SpanEntityStat";
import { SimsearchService } from "../../../../api/openapi/services/SimsearchService";
import { QueryKey } from "../../../../api/QueryKey";
import { SidebarContentSidebarLayout } from "../../../../components/content-layouts/SidebarContentSidebarLayout";
import { PercentageResizablePanel } from "../../../../components/resizable-panels/PercentageResizablePanel";
import { useLayoutPercentage } from "../../../../components/resizable-panels/useLayoutPercentage";
import { DocumentInfoPanel } from "../../../../core/source-document/info-panel/DocumentInfoPanel";
import { TagExplorer } from "../../../../core/tag/explorer/TagExplorer";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { SearchActions } from "../../store/documentSearchSlice";
import { SentenceSimilaritySearchTable } from "./_components/SentenceSimilaritySearchTable";

const filterName = "sentenceSimilaritySearch";
const routeApi = getRouteApi("/_auth/project/$projectId/sentencesearch");

export function SentenceSimilaritySearchView() {
  // router
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(SearchActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text, filterName }));
    },
    [dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName }));
    },
    [dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchActions.onAddTagFilter({ tagId, filterName }));
    },
    [dispatch],
  );

  // search
  const filter = useAppSelector((state) => state.search.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.sentenceSearch.topK);
  const threshold = useAppSelector((state) => state.sentenceSearch.threshold);
  const searchQuery = useAppSelector((state) => state.sentenceSearch.searchQuery);
  const { data, isError, isFetching, isLoading } = useQuery<SimSearchSentenceHit[]>({
    queryKey: [
      QueryKey.SENT_SIMSEARCH,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      topK,
      threshold,
    ],
    queryFn: () =>
      SimsearchService.findSimilarSentences({
        projId: projectId,
        threshold: threshold,
        topK: topK,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          query: searchQuery || "",
        },
      }),
  });
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // vertical sidebar percentage
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");

  // render
  return (
    <SidebarContentSidebarLayout
      leftSidebar={
        <PercentageResizablePanel
          firstContent={<TagExplorer onTagClick={handleAddTagFilter} />}
          secondContent={
            <SearchStatistics
              sx={{ height: "100%" }}
              projectId={projectId}
              sdocIds={sdocIds}
              handleKeywordClick={handleAddKeywordFilter}
              handleTagClick={handleAddTagFilter}
              handleCodeClick={handleAddCodeFilter}
            />
          }
          contentPercentage={percentage}
          onResize={handleResize}
        />
      }
      content={
        <SentenceSimilaritySearchTable
          projectId={projectId}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
        />
      }
      rightSidebar={
        <DocumentInfoPanel
          sdocId={selectedDocumentId}
          filterName={filterName}
          isIdleContent={<Typography padding={2}>Click on a sentence to see info :)</Typography>}
        />
      }
    />
  );
}
