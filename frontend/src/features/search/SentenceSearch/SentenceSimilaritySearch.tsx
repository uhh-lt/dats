import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { MetadataHooks } from "../../../api/MetadataHooks.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SimSearchSentenceHit } from "../../../api/openapi/models/SimSearchSentenceHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SimsearchService } from "../../../api/openapi/services/SimsearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { DocumentInfoPanel } from "../../../core/source-document/info-panel/DocumentInfoPanel.tsx";
import { TagExplorer } from "../../../core/tag/explorer/TagExplorer.tsx";
import { SidebarContentSidebarLayout } from "../../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { LayoutPercentageKeys } from "../../../layouts/layoutSlice.ts";
import { useLayoutPercentage } from "../../../layouts/ResizePanel/hooks/useLayoutPercentage.ts";
import { PercentageResizablePanel } from "../../../layouts/ResizePanel/PercentageResizablePanel.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import { SearchStatistics } from "../Statistics/SearchStatistics.tsx";
import { SentenceSimilaritySearchTable } from "./SentenceSimilaritySearchTable.tsx";

const filterName = "sentenceSimilaritySearch";
const routeApi = getRouteApi("/_auth/project/$projectId/sentencesearch");

export function SentenceSimilaritySearch() {
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
  const { percentage, handleResize } = useLayoutPercentage(LayoutPercentageKeys.SearchVerticalSidebar);

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
