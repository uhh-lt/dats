import { Divider, Grid, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { PaginatedElasticSearchDocumentHits } from "../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../api/openapi/models/SearchColumns.ts";
import { SortDirection } from "../../api/openapi/models/SortDirection.ts";
import { SpanEntityStat } from "../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../api/openapi/services/SearchService.ts";
import { MyFilter } from "../../features/FilterDialog/filterUtils.ts";
import TagExplorer from "../../features/TagExplorer/TagExplorer.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { SettingsActions } from "../settings/settingsSlice.ts";
import DocumentInformation from "./DocumentViewer/DocumentInformation/DocumentInformation.tsx";
import SearchDocumentTable from "./SearchResults/Table/SearchDocumentTable.tsx";
import SearchStatistics from "./SearchStatistics/SearchStatistics.tsx";
import { SearchFilterActions } from "./searchFilterSlice.ts";

const filterName = "root";

function Search() {
  // router
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
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
  const filter = useAppSelector((state) => state.searchFilter.filter[filterName]);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const { data, isError, isFetching, isLoading } = useQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      "search-document-table-data",
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
    ],
    queryFn: () =>
      SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        highlight: true,
        expertMode: false,
        requestBody: {
          filter: filter as MyFilter<SearchColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SearchColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        pageNumber: undefined,
        pageSize: undefined,
      }),
  });
  const sdocIds = useMemo(() => data?.hits.map((hit) => hit.sdoc_id) || [], [data]);

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
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
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
          className="h100"
          p={2}
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
        >
          <SearchDocumentTable
            projectId={projectId}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
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
            sdocId={selectedDocumentId}
            filterName={filterName}
            isIdleContent={<Typography padding={2}>Click a document to see info :)</Typography>}
            className="h100"
          />
        </Grid>
      </Grid>
    </>
  );
}

export default Search;
