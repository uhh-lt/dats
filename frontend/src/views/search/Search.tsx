import { Divider, Grid, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { SpanEntityStat } from "../../api/openapi/models/SpanEntityStat.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { SettingsActions } from "../settings/settingsSlice.ts";
import DocumentInformation from "./DocumentViewer/DocumentInformation/DocumentInformation.tsx";
import SearchDocumentTable from "./SearchResults/Table/SearchDocumentTable.tsx";
import SearchStatistics from "./SearchStatistics/SearchStatistics.tsx";
import TagExplorerNew from "./TagExplorer/TagExplorer.tsx";
import { useAddTagFilter } from "./hooks/useAddTagFilter.ts";
import { useNavigateIfNecessary } from "./hooks/useNavigateIfNecessary.ts";
import { SearchFilterActions } from "./searchFilterSlice.ts";

function Search() {
  // router
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  // const navigate = useNavigate();
  // const location = useLocation();

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

  // handle navigation
  const navigateIfNecessary = useNavigateIfNecessary();
  // const handleResultClick = (sdocId: number) => {
  //   // remove doc/:docId from url (if it exists) then add new doc id
  //   const url = removeTrailingSlash(location.pathname.split("/doc")[0]);
  //   navigate(`${url}/doc/${sdocId}`);
  //   dispatch(SearchActions.clearSelectedDocuments());
  // };

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(SearchFilterActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchFilterActions.onAddKeywordFilter({ keywordMetadataIds, keyword }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId, keywordMetadataIds],
  );
  const handleAddTagFilter = useAddTagFilter();

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
            sdocIds={[]}
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
          <SearchDocumentTable projectId={projectId} />
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
            isIdleContent={<Typography padding={2}>Click a document to see info :)</Typography>}
            className="h100"
          />
        </Grid>
      </Grid>
    </>
  );
}

export default Search;
