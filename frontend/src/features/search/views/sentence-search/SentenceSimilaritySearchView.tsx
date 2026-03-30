import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FILTER_PARAM } from "@core/filter";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { useResetTableStateOnSearch } from "@hooks/useResetTableStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import {
  addKeywordFilter,
  addMetadataFilter,
  addSpanAnnotationFilter,
  addTagFilter,
} from "../../_utils/searchFilterUtils";
import { SearchActions } from "../../store/documentSearchSlice";
import { SentenceSearchActions } from "../../store/sentenceSearchSlice";
import { sentenceSimilaritySearchQueryOptions } from "./_api/sentenceSimilaritySearchQueryOptions";
import { SentenceSimilaritySearchTable } from "./_components/SentenceSimilaritySearchTable";
import { SentenceSearchRouteAPI } from "./_hooks/sentenceSearchRouteAPI";

export function SentenceSimilaritySearchView() {
  const projectId = SentenceSearchRouteAPI.useParams({ select: (params) => params.projectId });

  // redux (global client state)
  const dispatch = useAppDispatch();
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const column2Info = useAppSelector((state) => state.search.column2Info);

  // sentence similarity search feature
  const { searchQuery, topK, threshold } = SentenceSearchRouteAPI.useSearch();
  const [filter, setFilter] = useURLConnector(SentenceSearchRouteAPI, FILTER_PARAM);
  const { data, isError, isFetching, isLoading } = useSuspenseQuery(
    sentenceSimilaritySearchQueryOptions({
      projectId,
      searchQuery,
      filter,
      topK,
      threshold,
    }),
  );
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // resetting search-parameter-dependant state
  useResetTableStateOnSearch([projectId, searchQuery, filter, topK, threshold], SentenceSearchActions);

  // filtering feature
  const { data: projectMetadata } = useSuspenseQuery(projectMetadataListQueryOptions(projectId));

  const keywordMetadataIds = useMemo(() => {
    return projectMetadata.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata]);

  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      setFilter((currentFilter) => addSpanAnnotationFilter(currentFilter, stat.code_id, stat.span_text));
    },
    [setFilter],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      setFilter((currentFilter) => addKeywordFilter(currentFilter, keywordMetadataIds, keyword));
    },
    [keywordMetadataIds, setFilter],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      setFilter((currentFilter) => addTagFilter(currentFilter, tagId));
    },
    [setFilter],
  );
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      setFilter((currentFilter) => addMetadataFilter(currentFilter, metadata, projectMetadata, column2Info));
    },
    [column2Info, setFilter],
  );

  // tag explorer handlers
  const handleExpandedTagIdsChange = useCallback(
    (ids: string[]) => dispatch(SearchActions.setExpandedTagIds(ids)),
    [dispatch],
  );

  // render
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");
  return (
    <SidebarContentSidebarLayout
      leftSidebar={
        <PercentageResizablePanel
          firstContent={
            <TagExplorer
              className="h100"
              onTagClick={handleAddTagFilter}
              expandedTagIds={expandedTagIds}
              onExpandedTagIdsChange={handleExpandedTagIdsChange}
            />
          }
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
          isIdleContent={<Typography padding={2}>Click on a sentence to see info :)</Typography>}
          onAddMetadataFilter={handleAddMetadataFilter}
        />
      }
    />
  );
}
