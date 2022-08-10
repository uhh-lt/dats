import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as React from "react";
import { useCallback, useContext, useMemo } from "react";
import { Box, Divider, Grid, Stack, Toolbar, Typography } from "@mui/material";
import DocumentViewer from "./DocumentViewer/DocumentViewer";
import SearchResults from "./SearchResults/SearchResults";
import TagExplorer from "./Tags/TagExplorer/TagExplorer";
import SearchBar from "./SearchBar/SearchBar";
import Portal from "@mui/material/Portal";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useForm } from "react-hook-form";
import SearchStatistics from "./SearchStatistics/SearchStatistics";
import { SearchService, SourceDocumentRead } from "../../api/openapi";
import { isNumber, parseInt } from "lodash";
import {
  createCodeFilter,
  createDocumentTagFilter,
  createKeywordFilter,
  createTextFilter,
  orderFilter,
  SearchFilter,
} from "./SearchFilter";
import { SearchActions } from "./searchSlice";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { useQuery } from "@tanstack/react-query";
import ToggleAllDocumentsButton from "./ToolBar/ToggleAllDocumentsButton";
import TableNavigation from "./ToolBar/TableNavigation";
import ToggleSplitViewButton from "./ToolBar/ToggleSplitViewButton";
import BackButton from "./ToolBar/BackButton";
import DocumentNavigation from "../../components/DocumentNavigation";
import ToggleShowEntitiesButton from "./ToolBar/ToggleShowEntitiesButton";
import DeleteButton from "./ToolBar/DeleteButton";
import TagMenuButton from "./ToolBar/TagMenuButton";
import SearchFilterChip from "./SearchFilterChip";
import MemoButton from "../../features/memo-dialog/MemoButton";
import ToggleShowTagsButton from "./ToolBar/ToggleShowTagsButton";
import ToggleListViewButton from "./ToolBar/ToggleListViewButton";

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
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);
  const isSplitView = useAppSelector((state) => state.search.isSplitView);
  const isListView = useAppSelector((state) => state.search.isListView);
  const isShowEntities = useAppSelector((state) => state.search.isShowEntities);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);
  const filters = useAppSelector((state) => state.search.filters);
  const dispatch = useAppDispatch();

  // query (global server state)
  const searchResults = useQuery<number[], Error>(["searchResults", filters], () => {
    const { keywords, tags, codes, texts } = orderFilter(filters);
    return SearchService.searchSdocsSearchSdocPost({
      requestBody: {
        proj_id: parseInt(projectId),
        span_entities: codes.length > 0 ? codes : undefined,
        tag_ids: tags.length > 0 ? tags : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        search_terms: texts.length > 0 ? texts : undefined,
        all_tags: true,
      },
    });
  });

  // state (local client state)
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // computed (local client state)
  const searchResultIds = useMemo(() => searchResults.data || [], [searchResults.data]);
  const numSearchResults = useMemo(() => (searchResults.data ? searchResults.data.length : 0), [searchResults]);
  const viewDocument = Boolean(sdocId);
  const selectedTag = useMemo(() => {
    if (filters.length === 1 && isNumber(filters[0].data)) {
      return filters[0].data;
    }
    return undefined;
  }, [filters]);

  // handle split view
  const toggleSplitView = () => {
    dispatch(SearchActions.toggleSplitView());
  };

  // handle list
  const toggleListView = () => {
    dispatch(SearchActions.toggleListView());
  };

  // handle show entities
  const toggleShowEntities = () => {
    dispatch(SearchActions.toggleShowEntities());
  };

  // handle show tags
  const toggleShowTags = () => {
    dispatch(SearchActions.toggleShowTags());
  };

  // handle navigation
  const navigateIfNecessary = useCallback(
    (to: string) => {
      if (to !== location.pathname) {
        navigate(to);
      }
    },
    [location.pathname, navigate]
  );
  const handleBackClick = () => {
    navigate(location.pathname.split("/doc")[0]);
  };
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

  // handle selecting
  const handleToggleAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      dispatch(SearchActions.setSelectedDocuments(searchResultIds));
      return;
    }
    dispatch(SearchActions.clearSelectedDocuments());
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
        <Grid item md={isSplitView ? 5 : 10} className="h100 myFlexContainer">
          <Stack direction="row" style={{ flexWrap: "wrap", gap: "8px" }}>
            {filters.map((filter) => (
              <SearchFilterChip key={filter.id} filter={filter} handleDelete={handleRemoveFilter} />
            ))}
          </Stack>

          <Toolbar disableGutters variant="dense" sx={{ minHeight: "52px", p: "0px 4px" }}>
            {viewDocument && !isSplitView ? (
              <>
                <BackButton onClick={() => handleBackClick()} />
                <MemoButton sdocId={parseInt(sdocId!)} />
              </>
            ) : (
              <ToggleAllDocumentsButton
                numSelectedDocuments={numSelectedDocuments}
                numTotalDocuments={numSearchResults}
                handleChange={handleToggleAllClick}
              />
            )}

            {(viewDocument || numSelectedDocuments > 0) && (
              <>
                <TagMenuButton popoverOrigin={{ horizontal: "center", vertical: "bottom" }} />
                <DeleteButton />
              </>
            )}

            {viewDocument && (
              <ToggleShowEntitiesButton showEntities={isShowEntities} handleClick={() => toggleShowEntities()} />
            )}

            <Box sx={{ flexGrow: 1 }} />
            {viewDocument && !isSplitView ? (
              <DocumentNavigation idsToNavigate={searchResultIds} searchPrefix="../search/doc/" showText={true} />
            ) : (
              <>
                <TableNavigation
                  page={page}
                  setPage={setPage}
                  rowsPerPage={rowsPerPage}
                  setRowsPerPage={setRowsPerPage}
                  numDocuments={numSearchResults}
                />

                <ToggleShowTagsButton showTags={isShowTags} handleClick={() => toggleShowTags()} />
                <ToggleListViewButton showList={isListView} onClick={() => toggleListView()} />
              </>
            )}
            <ToggleSplitViewButton isSplitView={isSplitView} onClick={() => toggleSplitView()} />
          </Toolbar>

          {viewDocument && !isSplitView ? (
            <DocumentViewer
              sdocId={sdocId ? parseInt(sdocId) : undefined}
              handleTagClick={handleAddTagFilter}
              showEntities={isShowEntities}
              className="myFlexFillAllContainer"
              isIdleContent={<Typography>Select a document to read it :)</Typography>}
            />
          ) : (
            <React.Fragment>
              {searchResults.isLoading && <div>Loading!</div>}
              {searchResults.isError && <div>Error: {searchResults.error.message}</div>}
              {searchResults.isSuccess && (
                <SearchResults
                  page={page}
                  rowsPerPage={rowsPerPage}
                  documentIds={searchResults.data}
                  handleResultClick={handleResultClick}
                />
              )}
            </React.Fragment>
          )}
        </Grid>
        {isSplitView && (
          <Grid item md={5} className="h100 myFlexContainer">
            <DocumentViewer
              sdocId={sdocId ? parseInt(sdocId) : undefined}
              handleTagClick={handleAddTagFilter}
              showEntities={isShowEntities}
              className="myFlexFillAllContainer"
              isIdleContent={<Typography>Select a document to read it :)</Typography>}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default Search;
