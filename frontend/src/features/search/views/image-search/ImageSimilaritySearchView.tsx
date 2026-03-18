import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { FILTER_PARAM, MyFilter, deserializeFilterFromSearchParam, serializeFilterToSearchParam } from "@core/filter";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { Box, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { projectMetadataListQueryOptions } from "../../_api/searchQueryOptions";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { useInitSearchFilterSlice } from "../../_hooks/useInitSearchFilterSlice";
import {
  addKeywordFilter,
  addMetadataFilter,
  addSpanAnnotationFilter,
  addTagFilter,
} from "../../_utils/searchFilterUtils";
import { SearchActions } from "../../store/documentSearchSlice";
import { ImageSearchActions } from "../../store/imageSearchSlice";
import { imageSimilaritySearchQueryOptions } from "./_api/imageSimilaritySearchQueryOptions";
import { ImageSimilaritySearchToolbar } from "./_components/ImageSimilaritySearchToolbar";
import { ImageSimilarityView } from "./_components/ImageSimilarityView";
import { ImageSearchRouteAPI } from "./_hooks/imageSearchRouteAPI";

const filterName = "imageSimilaritySearch";

export function ImageSimilaritySearchView() {
  // router
  const projectId = ImageSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery, searchFilter, topK, threshold } = ImageSearchRouteAPI.useSearch();
  const navigate = ImageSearchRouteAPI.useNavigate();

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const column2Info = useAppSelector((state) => state.search.column2Info);
  const dispatch = useAppDispatch();

  // clear stale selection whenever the search query changes (from SearchBar or cross-feature navigation)
  useEffect(() => {
    dispatch(ImageSearchActions.clearSelectedDocuments());
  }, [searchQuery, dispatch]);

  // filter
  const { data: projectMetadata } = useSuspenseQuery(projectMetadataListQueryOptions(projectId));

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    return projectMetadata.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata]);

  // search
  useInitSearchFilterSlice({ projectId });
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

  const { data, isError, isFetching, isLoading } = useQuery(
    imageSimilaritySearchQueryOptions({
      projectId,
      searchQuery,
      filter: filter as MyFilter<SdocColumns>,
      topK,
      threshold,
    }),
  );
  // extract sdoc ids from results, but they have to be unique
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
        <Box className="myFlexContainer h100">
          <ImageSimilaritySearchToolbar searchResultDocumentIds={sdocIds} />
          <ImageSimilarityView
            projectId={projectId}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            boxProps={{
              className: "myFlexFillAllContainer",
              sx: { p: 1 },
            }}
          />
        </Box>
      }
      rightSidebar={
        <DocumentInfoPanel
          sdocId={selectedDocumentId}
          isIdleContent={<Typography padding={2}>Click on an image to see info :)</Typography>}
          onAddMetadataFilter={handleAddMetadataFilter}
        />
      }
    />
  );
}
