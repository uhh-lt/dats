import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as React from "react";
import { useCallback, useContext, useMemo } from "react";
import { Divider, Grid, Stack, Typography } from "@mui/material";
import DocumentViewer from "./DocumentViewer/DocumentViewer";
import SearchResults from "./SearchResults/SearchResults";
import TagExplorer from "./Tags/TagExplorer/TagExplorer";
import SearchBar from "./SearchBar/SearchBar";
import Portal from "@mui/material/Portal";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useForm } from "react-hook-form";
import SearchStatistics from "./SearchStatistics/SearchStatistics";
import { SourceDocumentRead } from "../../api/openapi";
import { isNumber, parseInt } from "lodash";
import {
  createCodeFilter,
  createDocumentTagFilter,
  createKeywordFilter,
  createTextFilter,
  SearchFilter,
} from "./SearchFilter";
import { SearchActions } from "./searchSlice";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import SearchFilterChip from "./SearchFilterChip";
import DocumentViewerToolbar from "./ToolBar/DocumentViewerToolbar";
import SearchResultsToolbar from "./ToolBar/SearchResultsToolbar";
import Box from "@mui/material/Box";
import SearchHooks from "../../api/SearchHooks";

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
  const isShowEntities = useAppSelector((state) => state.search.isShowEntities);
  const filters = useAppSelector((state) => state.search.filters);
  const dispatch = useAppDispatch();

  // query (global server state)
  const searchResults = SearchHooks.useSearchDocumentsByProjectIdAndFilters(parseInt(projectId), filters);

  // computed (local client state)
  const searchResultIds = useMemo(() => searchResults.data || [], [searchResults.data]);
  const viewDocument = Boolean(sdocId);
  const selectedTag = useMemo(() => {
    if (filters.length === 1 && isNumber(filters[0].data)) {
      return filters[0].data;
    }
    return undefined;
  }, [filters]);

  // handle navigation
  const navigateIfNecessary = useCallback(
    (to: string) => {
      if (to !== location.pathname) {
        navigate(to);
      }
    },
    [location.pathname, navigate]
  );
  const handleResultClick = (sdoc: SourceDocumentRead) => {
    // remove doc/:docId from url (if it exists) then add new doc id
    let url = removeTrailingSlash(location.pathname.split("/doc")[0]);
    navigate(`${url}/doc/${sdoc.id}`);
    dispatch(SearchActions.clearSelectedDocuments());
  };

  // handle search form
  const handleSearch = (data: any) => {
    if (data.query.trim().length > 0) {
      handleAddTextFilter(data.query);
      reset();
    }
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
    (codeId: number, text: string) => {
      dispatch(SearchActions.addFilter(createCodeFilter(codeId, text)));
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
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchActions.addFilter(createDocumentTagFilter(tagId)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId]
  );
  const handleAddTextFilter = useCallback(
    (text: string) => {
      dispatch(SearchActions.addFilter(createTextFilter(text)));
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
            sdocIds={searchResultIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </Grid>
        <Grid item md={10} className="myFlexContainer h100">
          <Box className="myFlexFitContent">
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
              <SearchResultsToolbar searchResultIds={searchResultIds} className="myFlexFitContentContainer" />
              <React.Fragment>
                {searchResults.isLoading && <div>Loading!</div>}
                {searchResults.isError && <div>Error: {searchResults.error.message}</div>}
                {searchResults.isSuccess && (
                  <SearchResults
                    documentIds={searchResultIds}
                    handleResultClick={handleResultClick}
                    className="myFlexFillAllContainer"
                  />
                )}
              </React.Fragment>
            </Grid>
            <Grid
              item
              md={isSplitView ? 6 : 12}
              display={isSplitView || viewDocument ? "flex" : "none"}
              className="myFlexContainer h100"
            >
              {sdocId && <DocumentViewerToolbar sdocId={parseInt(sdocId)} searchResultIds={searchResultIds} />}
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
