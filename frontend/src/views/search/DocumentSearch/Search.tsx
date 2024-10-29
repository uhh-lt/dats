import { Divider, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import TwoSidebarsLayout from "../../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import SearchDocumentTable from "./SearchDocumentTable.tsx";
import { SearchActions } from "./searchSlice.ts";

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

  // render
  return (
    <TwoSidebarsLayout
      leftSidebar={
        <>
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </>
      }
      content={<SearchDocumentTable projectId={projectId} />}
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
