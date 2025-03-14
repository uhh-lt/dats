import { Typography } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import SidebarContentSidebarLayout from "../../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { LayoutActions } from "../../../layouts/layoutSlice.ts";
import { VerticalPercentageResizablePanel } from "../../../layouts/ResizePanel/VerticalPercentageResizablePanel.tsx";
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
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

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

  // search results
  const [sdocIds, setSdocIds] = useState<number[]>([]);
  const handleSearchResultsChange = useCallback((sdocIds: number[]) => {
    console.log("Search results changed", sdocIds);
    setSdocIds(sdocIds);
  }, []);

  // vertical content percentage
  const verticalContentPercentage = useAppSelector((state) => state.layout.verticalContentPercentage);

  // render
  return (
    <SidebarContentSidebarLayout
      leftSidebar={
        <VerticalPercentageResizablePanel
          topContent={<TagExplorer onTagClick={handleAddTagFilter} />}
          bottomContent={
            <SearchStatistics
              sx={{ height: "100%" }}
              sdocIds={sdocIds}
              handleKeywordClick={handleAddKeywordFilter}
              handleTagClick={handleAddTagFilter}
              handleCodeClick={handleAddCodeFilter}
            />
          }
          verticalContentPercentage={verticalContentPercentage}
          onResize={(percentage) => dispatch(LayoutActions.setVerticalContentPercentage(percentage))}
        />
      }
      content={<SearchDocumentTable projectId={projectId} onSearchResultsChange={handleSearchResultsChange} />}
      rightSidebar={
        <DocumentInformation
          sdocId={selectedDocumentId}
          filterName={filterName}
          isIdleContent={<Typography padding={2}>Click a document to see info :)</Typography>}
        />
      }
    />
  );
}

export default Search;
