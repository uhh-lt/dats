import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { MyFilter, createEmptyFilter } from "@core/filter";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { SearchActions } from "../../store/documentSearchSlice";
import { SentenceSearchActions } from "../../store/sentenceSearchSlice";
import { sentenceSimilaritySearchQueryOptions } from "./_api/sentenceSimilaritySearchQueryOptions";
import { SentenceSimilaritySearchTable } from "./_components/SentenceSimilaritySearchTable";
import { SentenceSearchRouteAPI } from "./_hooks/sentenceSearchRouteAPI";

const filterName = "sentenceSimilaritySearch";

export function SentenceSimilaritySearchView() {
  // router
  const projectId = SentenceSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery } = SentenceSearchRouteAPI.useSearch();

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const dispatch = useAppDispatch();

  // clear stale selection whenever the search query changes (from SearchBar or cross-feature navigation)
  useEffect(() => {
    dispatch(SentenceSearchActions.onClearRowSelection());
  }, [searchQuery, dispatch]);

  // filter
  const { data: projectMetadata } = useSuspenseQuery(projectMetadataListQueryOptions(projectId));

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    return projectMetadata.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata]);

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
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      dispatch(SearchActions.onAddMetadataFilter({ metadata, projectMetadata, filterName }));
    },
    [dispatch],
  );

  // tag explorer handlers
  const handleExpandedTagIdsChange = useCallback(
    (ids: string[]) => dispatch(SearchActions.setExpandedTagIds(ids)),
    [dispatch],
  );

  // search
  const filter = useAppSelector((state) => state.search.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.sentenceSearch.topK);
  const threshold = useAppSelector((state) => state.sentenceSearch.threshold);
  const { data, isError, isFetching, isLoading } = useQuery(
    sentenceSimilaritySearchQueryOptions({
      projectId,
      searchQuery,
      filter: filter as MyFilter<SdocColumns>,
      topK,
      threshold,
    }),
  );
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // vertical sidebar percentage
  const { percentage, handleResize } = useLayoutPercentage("search-vertical-sidebar");

  // render
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
