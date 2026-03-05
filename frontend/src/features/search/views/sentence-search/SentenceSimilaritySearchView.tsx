import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SimSearchSentenceHit } from "@api/models/SimSearchSentenceHit";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SimsearchService } from "@api/services/SimsearchService";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { MyFilter, createEmptyFilter } from "@components/filter";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { SearchActions } from "../../store/documentSearchSlice";
import { SentenceSearchActions } from "../../store/sentenceSearchSlice";
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
