import { Divider, Grid, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SimSearchImageHit } from "../../../api/openapi/models/SimSearchImageHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import { MyFilter, createEmptyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import TagExplorerNew from "../../../features/TagExplorer/TagExplorer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SettingsActions } from "../../settings/settingsSlice.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import ImageSimilaritySearchToolbar from "./ImageSimilaritySearchToolbar.tsx";
import ImageSimilarityView from "./ImageSimilarityView.tsx";

const filterName = "imageSimilaritySearch";

function ImageSimilaritySearch() {
  // router
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(
        SearchFilterActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text, filterName }),
      );
    },
    [dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchFilterActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName }));
    },
    [dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchFilterActions.onAddTagFilter({ tagId, filterName }));
    },
    [dispatch],
  );

  // hack to disable sentences
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);
  useEffect(() => {
    if (projectCodes.data) {
      const sentence = projectCodes.data.find((code) => code.name === "SENTENCE");
      if (sentence) {
        dispatch(SettingsActions.disableCode(sentence.id));
      }
    }
  }, [dispatch, projectCodes.data]);

  // search
  useInitSearchFilterSlice({ projectId });
  const filter = useAppSelector((state) => state.searchFilter.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.imageSearch.topK);
  const threshold = useAppSelector((state) => state.imageSearch.threshold);
  const searchQuery = useAppSelector((state) => state.imageSearch.searchQuery);
  const { data, isError, isFetching, isLoading } = useQuery<SimSearchImageHit[]>({
    queryKey: [
      "image-similarity-search",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      topK,
      threshold,
    ],
    queryFn: () =>
      SearchService.findSimilarImages({
        requestBody: {
          query: searchQuery,
          top_k: topK,
          proj_id: projectId,
          filter: filter as MyFilter<SearchColumns>,
          threshold: threshold,
        },
      }),
  });
  // extract sdoc ids from results, but they have to be unique
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // render
  return (
    <>
      <Grid container className="h100">
        <Grid
          item
          md={2}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderRight: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <TagExplorerNew sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={sdocIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </Grid>
        <Grid
          item
          md={8}
          className="h100 myFlexContainer"
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
        >
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
        </Grid>
        <Grid
          item
          md={2}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderLeft: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <DocumentInformation
            filterName={filterName}
            sdocId={selectedDocumentId}
            isIdleContent={<Typography padding={2}>Click on an image to see info :)</Typography>}
            className="h100"
          />
        </Grid>
      </Grid>
    </>
  );
}

export default ImageSimilaritySearch;
