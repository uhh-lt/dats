import { Box, Divider, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import TwoSidebarsLayout from "../../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SettingsActions } from "../../settings/settingsSlice.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import SearchDocumentTable from "./SearchDocumentTable.tsx";

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
    <TwoSidebarsLayout
      leftSidebar={
        <>
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={sdocIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </>
      }
      content={
        <Box className="h100" sx={{ p: 2 }}>
          <SearchDocumentTable
            projectId={projectId}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
          />
        </Box>
      }
      rightSidebar={
        <DocumentInformation
          sdocId={selectedDocumentId}
          filterName={filterName}
          isIdleContent={<Typography padding={2}>Click a document to see info :)</Typography>}
          className="h100"
        />
      }
    />
  );
}

export default Search;
