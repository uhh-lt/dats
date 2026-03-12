import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SimSearchImageHit } from "@api/models/SimSearchImageHit";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import { SpanEntityStat } from "@api/models/SpanEntityStat";
import { SimsearchService } from "@api/services/SimsearchService";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { MyFilter, createEmptyFilter } from "@core/filter";
import { DocumentInfoPanel } from "@core/source-document";
import { TagExplorer } from "@core/tag";
import { Box, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { SearchStatistics } from "../../_components/statistics/SearchStatistics";
import { useInitSearchFilterSlice } from "../../_hooks/useInitSearchFilterSlice";
import { SearchActions } from "../../store/documentSearchSlice";
import { ImageSearchActions } from "../../store/imageSearchSlice";
import { ImageSimilaritySearchToolbar } from "./_components/ImageSimilaritySearchToolbar";
import { ImageSimilarityView } from "./_components/ImageSimilarityView";
import { ImageSearchRouteAPI } from "./_hooks/imageSearchRouteAPI";

const filterName = "imageSimilaritySearch";

export function ImageSimilaritySearchView() {
  // router
  const projectId = ImageSearchRouteAPI.useParams({ select: (params) => params.projectId });
  const { searchQuery } = ImageSearchRouteAPI.useSearch();

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const dispatch = useAppDispatch();

  // clear stale selection whenever the search query changes (from SearchBar or cross-feature navigation)
  useEffect(() => {
    dispatch(ImageSearchActions.clearSelectedDocuments());
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
  useInitSearchFilterSlice({ projectId });
  const filter = useAppSelector((state) => state.search.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.imageSearch.topK);
  const threshold = useAppSelector((state) => state.imageSearch.threshold);
  const { data, isError, isFetching, isLoading } = useQuery<SimSearchImageHit[]>({
    queryKey: [
      QueryKey.IMG_SIMSEARCH,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      topK,
      threshold,
    ],
    queryFn: () =>
      SimsearchService.findSimilarImages({
        projId: projectId,
        threshold: threshold,
        topK: topK,
        requestBody: {
          query: searchQuery,
          filter: filter as MyFilter<SdocColumns>,
        },
      }),
  });
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
