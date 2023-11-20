import { Container, Divider, Grid, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Portal from "@mui/material/Portal";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import SearchHooks from "../../api/SearchHooks";
import { SourceDocumentRead, SpanEntityDocumentFrequency } from "../../api/openapi";
import TagExplorer from "../../features/TagExplorer/TagExplorer";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SettingsActions } from "../settings/settingsSlice";
import DocumentViewer from "./DocumentViewer/DocumentViewer";
import { QueryType } from "./QueryType";
import SearchBar from "./SearchBar/SearchBar";
import SearchFilterDialog from "./SearchFilterDialog";
import SearchResultsView from "./SearchResults/SearchResultsView";
import SearchStatistics from "./SearchStatistics/SearchStatistics";
import SearchToolbar from "./ToolBar/SearchToolbar";
import { useAddTagFilter } from "./hooks/useAddTagFilter";
import { useNavigateIfNecessary } from "./hooks/useNavigateIfNecessary";
import { SearchActions } from "./searchSlice";
import { useInitSearchFilterSlice } from "./useInitSearchFilterSlice";

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
  const searchType = useAppSelector((state) => state.search.searchType);
  const dispatch = useAppDispatch();

  // filter
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);
  const projectMetadata = ProjectHooks.useGetMetadata(parseInt(projectId));
  useInitSearchFilterSlice({ projectId: parseInt(projectId) });

  // query (global server state)
  const searchResults = SearchHooks.useSearchDocumentsNew(parseInt(projectId));

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  const viewDocument = Boolean(sdocId);

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
    navigateIfNecessary(`/project/${projectId}/search/`);
  };

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityDocumentFrequency) => {
      dispatch(SearchActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchActions.onAddKeywordFilter({ keywordMetadataIds, keyword }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId, keywordMetadataIds],
  );
  const handleAddTagFilter = useAddTagFilter();
  const handleAddTextFilter = useCallback(
    (text: string) => {
      alert("not implemented");
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
  const handleAddFileFilter = useCallback(
    (filename: string) => {
      dispatch(SearchActions.onAddFilenameFilter({ filename }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );

  const handleAddSentenceFilter = useCallback(
    (sentence: string) => {
      alert("Not implemented!");
      // dispatch(SearchActions.addFilter(createSentenceFilter(sentence)));
      // dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [navigateIfNecessary, projectId],
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
  console.log("rendering search");
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
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} showButtons />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={searchResults.data?.getSearchResultSDocIds() || []}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </Grid>
        <Grid
          item
          md={10}
          className="h100"
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
          ref={filterDialogAnchorRef}
        >
          <SearchToolbar
            sdocId={sdocId ? parseInt(sdocId) : undefined}
            searchResultDocumentIds={searchResults.data?.getSearchResultSDocIds() || []}
            numSearchResults={searchResults.data?.getAggregatedNumberOfHits() || 0}
            isSplitView={isSplitView}
            viewDocument={viewDocument}
          />
          <Box className="myFlexContainer" sx={{ height: "calc(100% - 54px)" }}>
            <SearchFilterDialog anchorEl={filterDialogAnchorRef.current} />
            <Grid container className="myFlexFillAllContainer" sx={{ height: "calc(100% - 54px)" }}>
              <Grid
                item
                md={isSplitView ? 6 : 12}
                display={isSplitView || !viewDocument ? "flex" : "none"}
                className="h100"
              >
                <>
                  {searchResults.isLoading && <div>Loading!</div>}
                  {searchResults.isError && <div>Error: {searchResults.error.message}</div>}
                  {searchResults.isSuccess && (
                    <SearchResultsView
                      searchResults={searchResults.data}
                      handleResultClick={handleResultClick}
                      className="h100"
                    />
                  )}
                </>
              </Grid>
              <Grid
                item
                md={isSplitView ? 6 : 12}
                display={isSplitView || viewDocument ? "flex" : "none"}
                className="h100"
                overflow={"auto"}
              >
                <Container sx={{ my: 2, height: "fit-content" }}>
                  <DocumentViewer
                    sdocId={sdocId ? parseInt(sdocId) : undefined}
                    handleTagClick={handleAddTagFilter}
                    showEntities={isShowEntities}
                    isIdleContent={<Typography>Click a document to read it :)</Typography>}
                  />
                </Container>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Search;
