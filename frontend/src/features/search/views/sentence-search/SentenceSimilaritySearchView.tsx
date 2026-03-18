import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FILTER_PARAM, MyFilter, deserializeFilterFromSearchParam, serializeFilterToSearchParam } from "@core/filter";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
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

const filterName = "sentenceSimilaritySearch";

export function SentenceSimilaritySearchView() {
  // router
  const projectId = SentenceSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery, searchFilter, topK, threshold } = SentenceSearchRouteAPI.useSearch();
  const navigate = SentenceSearchRouteAPI.useNavigate();

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const column2Info = useAppSelector((state) => state.search.column2Info);
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

  const filter = useMemo(() => deserializeFilterFromSearchParam(searchFilter, filterName), [searchFilter]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      const nextFilter = addSpanAnnotationFilter(filter, stat.code_id, stat.span_text);
      navigate({
        search: (prev) => ({ ...prev, [FILTER_PARAM]: serializeFilterToSearchParam(nextFilter) }),
        replace: true,
      });
    },
    [filter, navigate],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      const nextFilter = addKeywordFilter(filter, keywordMetadataIds, keyword);
      navigate({
        search: (prev) => ({ ...prev, [FILTER_PARAM]: serializeFilterToSearchParam(nextFilter) }),
        replace: true,
      });
    },
    [filter, keywordMetadataIds, navigate],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      const nextFilter = addTagFilter(filter, tagId);
      navigate({
        search: (prev) => ({ ...prev, [FILTER_PARAM]: serializeFilterToSearchParam(nextFilter) }),
        replace: true,
      });
    },
    [filter, navigate],
  );
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      const nextFilter = addMetadataFilter(filter, metadata, projectMetadata, column2Info);
      navigate({
        search: (prev) => ({ ...prev, [FILTER_PARAM]: serializeFilterToSearchParam(nextFilter) }),
        replace: true,
      });
    },
    [column2Info, filter, navigate],
  );

  // tag explorer handlers
  const handleExpandedTagIdsChange = useCallback(
    (ids: string[]) => dispatch(SearchActions.setExpandedTagIds(ids)),
    [dispatch],
  );

  // search
  const { data, isError, isFetching } = useSuspenseQuery(
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
          isLoading={false}
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
