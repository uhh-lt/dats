import { Box, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SimSearchImageHit } from "../../../api/openapi/models/SimSearchImageHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SimsearchService } from "../../../api/openapi/services/SimsearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import SidebarContentSidebarLayout from "../../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { LayoutPercentageKeys } from "../../../layouts/layoutSlice.ts";
import { useLayoutPercentage } from "../../../layouts/ResizePanel/hooks/useLayoutPercentage.ts";
import PercentageResizablePanel from "../../../layouts/ResizePanel/PercentageResizablePanel.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import ImageSimilaritySearchToolbar from "./ImageSimilaritySearchToolbar.tsx";
import ImageSimilarityView from "./ImageSimilarityView.tsx";

const filterName = "imageSimilaritySearch";
const routeApi = getRouteApi("/_auth/project/$projectId/imagesearch");

function ImageSimilaritySearch() {
  // router
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
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
  useInitSearchFilterSlice({ projectId });
  const filter = useAppSelector((state) => state.search.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.imageSearch.topK);
  const threshold = useAppSelector((state) => state.imageSearch.threshold);
  const searchQuery = useAppSelector((state) => state.imageSearch.searchQuery);
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
        <DocumentInformation
          filterName={filterName}
          sdocId={selectedDocumentId}
          isIdleContent={<Typography padding={2}>Click on an image to see info :)</Typography>}
        />
      }
    />
  );
}

export default ImageSimilaritySearch;
