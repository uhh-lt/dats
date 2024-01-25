import { Container, Divider, Grid, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Portal from "@mui/material/Portal";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import SearchHooks from "../../api/SearchHooks";
import { SpanEntityStat } from "../../api/openapi";
import TagExplorer from "../../features/TagExplorer/TagExplorer";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SettingsActions } from "../settings/settingsSlice";
import DocumentViewer from "./DocumentViewer/DocumentViewer";
import SearchBar from "./SearchBar/SearchBar";
import SearchResultCardsView from "./SearchResults/Cards/SearchResultCardsView";
import SearchResultsTableView from "./SearchResults/Table/SearchResultsTableView";
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
  const appBarContainerRef = useContext(AppBarContext);

  // redux (global client state)
  const isSplitView = useAppSelector((state) => state.search.isSplitView);
  const isTableView = useAppSelector((state) => state.search.isTableView);
  const SearchResultsView = isTableView ? SearchResultsTableView : SearchResultCardsView;
  const isShowEntities = useAppSelector((state) => state.search.isShowEntities);
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = ProjectHooks.useGetMetadata(parseInt(projectId));
  const columnInfo = useInitSearchFilterSlice({ projectId: parseInt(projectId) });

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
  const handleResultClick = (sdocId: number) => {
    // remove doc/:docId from url (if it exists) then add new doc id
    let url = removeTrailingSlash(location.pathname.split("/doc")[0]);
    navigate(`${url}/doc/${sdocId}`);
    dispatch(SearchActions.clearSelectedDocuments());
  };

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
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
        <SearchBar placeholder="Search documents..." />{" "}
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
        >
          <SearchToolbar
            sdocId={sdocId ? parseInt(sdocId) : undefined}
            searchResultDocumentIds={searchResults.data?.getSearchResultSDocIds() || []}
            numSearchResults={searchResults.data?.getNumberOfHits() || 0}
            isSplitView={isSplitView}
            viewDocument={viewDocument}
          />
          <Box className="myFlexContainer" sx={{ height: "calc(100% - 54px)" }}>
            <Grid container className="myFlexFillAllContainer" sx={{ height: "calc(100% - 54px)" }}>
              {(isSplitView || !viewDocument) && (
                <Grid item md={isSplitView ? 6 : 12} className="h100">
                  {searchResults.isLoading && <div>Loading!</div>}
                  {searchResults.isError && <div>Error: {searchResults.error.message}</div>}
                  {searchResults.isSuccess && columnInfo.isSuccess && (
                    <Container
                      sx={{
                        py: 2,
                        height: "100%",
                        maxWidth: "100% !important",
                      }}
                    >
                      {searchResults.data.getNumberOfHits() === 0 ? (
                        <Typography>No search results for this query...</Typography>
                      ) : (
                        <SearchResultsView
                          searchResults={searchResults.data}
                          columnInfo={columnInfo.data}
                          handleResultClick={handleResultClick}
                        />
                      )}
                    </Container>
                  )}
                </Grid>
              )}
              {(isSplitView || viewDocument) && (
                <Grid item md={isSplitView ? 6 : 12} className="h100" overflow={"auto"}>
                  <Container sx={{ my: 2, height: "fit-content" }}>
                    <DocumentViewer
                      sdocId={sdocId ? parseInt(sdocId) : undefined}
                      handleTagClick={handleAddTagFilter}
                      showEntities={isShowEntities}
                      isIdleContent={<Typography>Click a document to read it :)</Typography>}
                    />
                  </Container>
                </Grid>
              )}
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default Search;
