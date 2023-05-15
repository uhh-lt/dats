import { Divider, Grid, Stack, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Portal from "@mui/material/Portal";
import { isNumber } from "lodash";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import SearchHooks from "../../api/SearchHooks";
import { SourceDocumentRead, SpanEntityDocumentFrequency } from "../../api/openapi";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SettingsActions } from "../settings/settingsSlice";
import DocumentViewer from "./DocumentViewer/DocumentViewer";
import { QueryType } from "./QueryType";
import SearchBar from "./SearchBar/SearchBar";
import {
  SearchFilter,
  createCodeFilter,
  createFilenameFilter,
  createKeywordFilter,
  createSentenceFilter,
  createTermFilter,
} from "./SearchFilter";
import SearchFilterChip from "./SearchFilterChip";
import SearchResultsView from "./SearchResults/SearchResultsView";
import SearchStatistics from "./SearchStatistics/SearchStatistics";
import TagExplorer from "./Tags/TagExplorer/TagExplorer";
import DocumentViewerToolbar from "./ToolBar/DocumentViewerToolbar";
import SearchResultsToolbar from "./ToolBar/SearchResultsToolbar";
import { useAddTagFilter } from "./hooks/useAddTagFilter";
import { useNavigateIfNecessary } from "./hooks/useNavigateIfNecessary";
import { SearchActions } from "./searchSlice";

export function removeTrailingSlash(text: string): string {
  return text.replace(/\/$/, "");
}

function Search() {
  // router
  const { projectId, sdocId } = useParams() as {
    projectId: string;
    sdocId: string | undefined;
  };
  const navigate = useNavigate();
  const location = useLocation();

  // searchbar
  const { register, handleSubmit, reset } = useForm();
  const appBarContainerRef = useContext(AppBarContext);

  // redux (global client state)
  const isSplitView = useAppSelector((state) => state.search.isSplitView);
  const isListView = useAppSelector((state) => state.search.isListView);
  const isShowEntities = useAppSelector((state) => state.search.isShowEntities);
  const searchType = useAppSelector((state) => state.search.searchType);
  const filters = useAppSelector((state) => state.search.filters);
  const dispatch = useAppDispatch();

  // query (global server state)
  const searchResults = SearchHooks.useSearchDocumentsByProjectIdAndFilters(parseInt(projectId), filters);

  // computed (local client state)
  const searchResultDocumentIds = useMemo(() => {
    if (!searchResults.data) return [];
    return searchResults.data.getSearchResultSDocIds();
  }, [searchResults.data]);

  const numSearchResults = useMemo(() => {
    if (!searchResults.data) return 0;
    // in list view we show every single sentence
    if (isListView) {
      return searchResults.data.getNumberOfHits();
    }
    return searchResults.data.getAggregatedNumberOfHits();
  }, [isListView, searchResults.data]);

  const viewDocument = Boolean(sdocId);

  const selectedTag = useMemo(() => {
    if (filters.length === 1 && isNumber(filters[0].data)) {
      return filters[0].data;
    }
    return undefined;
  }, [filters]);

  // handle navigation
  const navigateIfNecessary = useNavigateIfNecessary();
  const handleResultClick = (sdoc: SourceDocumentRead) => {
    // remove doc/:docId from url (if it exists) then add new doc id
    let url = removeTrailingSlash(location.pathname.split("/doc")[0]);
    navigate(`${url}/doc/${sdoc.id}`);
    dispatch(SearchActions.clearSelectedDocuments());
  };

  // handle search form
  const handleSearch = (data: any) => {
    if (data.query.trim().length === 0) return;
    switch (searchType) {
      case QueryType.LEXICAL:
        handleAddTextFilter(data.query);
        break;
      case QueryType.FILENAME:
        handleAddFileFilter(data.query);
        break;
      case QueryType.SEMANTIC:
        handleAddSentenceFilter(data.query);
        break;
    }
    reset();
  };
  const handleSearchError = (data: any) => console.error(data);
  const handleClearSearch = () => {
    reset();
    dispatch(SearchActions.clearSelectedDocuments());
    dispatch(SearchActions.clearFilters());
    navigateIfNecessary(`/project/${projectId}/search/`);
  };

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityDocumentFrequency) => {
      dispatch(SearchActions.addFilter(createCodeFilter(stat.code_id, stat.span_text)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchActions.addFilter(createKeywordFilter(keyword)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );
  const handleAddTagFilter = useAddTagFilter();
  const handleAddTextFilter = useCallback(
    (text: string) => {
      dispatch(SearchActions.addFilter(createTermFilter(text)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );
  const handleAddFileFilter = useCallback(
    (filename: string) => {
      dispatch(SearchActions.addFilter(createFilenameFilter(filename)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );

  const handleAddSentenceFilter = useCallback(
    (sentence: string) => {
      dispatch(SearchActions.addFilter(createSentenceFilter(sentence)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );

  const handleRemoveFilter = useCallback(
    (filter: SearchFilter) => {
      dispatch(SearchActions.removeFilter(filter));
    },
    [dispatch]
  );

  // hack to disable sentences
  const projectCodes = ProjectHooks.useGetAllCodes(parseInt(projectId), true);
  useEffect(() => {
    if (projectCodes.data) {
      const sentence = projectCodes.data.find((code) => code.name === "SENTENCE");
      if (sentence) {
        dispatch(SettingsActions.disableCode(sentence.id));
      }
    }
  }, [dispatch, projectCodes.data]);

  // render
  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <SearchBar
          register={register}
          handleSubmit={handleSubmit(handleSearch, handleSearchError)}
          handleClearSearch={handleClearSearch}
          placeholder="Search documents..."
        />
      </Portal>
      <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
        <Grid item md={2} className="h100">
          <TagExplorer
            sx={{ height: "50%", overflowY: "auto", pt: 0 }}
            selectedTag={selectedTag}
            handleAllDocumentsClick={handleClearSearch}
            handleNewDocumentsClick={handleClearSearch}
            handleTagClick={handleAddTagFilter}
          />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            filter={filters}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </Grid>
        <Grid item md={10} className="myFlexContainer h100">
          <Box className="myFlexFitContentContainer">
            <Stack direction="row" style={{ flexWrap: "wrap", gap: "8px" }}>
              {filters.length > 0 && <Typography variant="h6">Filter:</Typography>}
              {filters.map((filter) => (
                <SearchFilterChip key={filter.id} filter={filter} handleDelete={handleRemoveFilter} />
              ))}
            </Stack>
          </Box>
          <Grid container className="myFlexFillAllContainer">
            <Grid
              item
              md={isSplitView ? 6 : 12}
              display={isSplitView || !viewDocument ? "flex" : "none"}
              className="myFlexContainer h100"
            >
              <SearchResultsToolbar
                searchResultDocumentIds={searchResultDocumentIds}
                numSearchResults={numSearchResults}
                className="myFlexFitContentContainer"
              />
              <>
                {searchResults.isLoading && <div>Loading!</div>}
                {searchResults.isError && <div>Error: {searchResults.error.message}</div>}
                {searchResults.isSuccess && (
                  <SearchResultsView
                    searchResults={searchResults.data}
                    handleResultClick={handleResultClick}
                    className="myFlexFillAllContainer"
                  />
                )}
              </>
            </Grid>
            <Grid
              item
              md={isSplitView ? 6 : 12}
              display={isSplitView || viewDocument ? "flex" : "none"}
              className="myFlexContainer h100"
            >
              {sdocId && <DocumentViewerToolbar sdocId={parseInt(sdocId)} searchResultIds={searchResultDocumentIds} />}
              <DocumentViewer
                sdocId={sdocId ? parseInt(sdocId) : undefined}
                handleTagClick={handleAddTagFilter}
                showEntities={isShowEntities}
                className="myFlexFillAllContainer"
                isIdleContent={<Typography>Click a document to read it :)</Typography>}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default Search;
