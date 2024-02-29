import * as React from "react";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SentenceSimilaritySearchResults,
} from "../../../../api/SearchHooks.ts";
import { ColumnInfo_SearchColumns_ } from "../../../../api/openapi/models/ColumnInfo_SearchColumns_.ts";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";
import SearchResultContextMenu from "../SearchResultContextMenu.tsx";
import SearchResultsTable from "./SearchResultTable.tsx";

interface SearchResultsTableViewProps {
  searchResults: LexicalSearchResults | SentenceSimilaritySearchResults | ImageSimilaritySearchResults;
  handleResultClick: (sdocId: number) => void;
  columnInfo: ColumnInfo_SearchColumns_[];
}

export default function SearchResultsTableView({
  searchResults,
  handleResultClick,
  columnInfo,
}: SearchResultsTableViewProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const dispatch = useAppDispatch();

  // context menu
  const [contextMenuData, setContextMenuData] = useState<number>();
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const openContextMenu = useCallback(
    (sdocId: number) => (event: React.MouseEvent) => {
      event.preventDefault();
      if (selectedDocumentIds.indexOf(sdocId) === -1) {
        dispatch(SearchActions.setSelectedDocuments([sdocId]));
      }
      setContextMenuData(sdocId);
      setContextMenuPosition({ x: event.pageX, y: event.pageY });
    },
    [dispatch, selectedDocumentIds],
  );
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  // render
  return (
    <>
      <SearchResultsTable
        sdocIds={searchResults.getSearchResultSDocIds()}
        columnInfo={columnInfo}
        onRowContextMenu={openContextMenu}
        onRowClick={handleResultClick}
      />
      <SearchResultContextMenu
        projectId={projectId}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </>
  );
}
