import * as React from "react";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchResults } from "../../../../api/SearchHooks";
import { ColumnInfo_SearchColumns_ } from "../../../../api/openapi";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";
import SearchResultContextMenu from "../SearchResultContextMenu";
import SearchResultsTable from "./SearchResultTable";

interface SearchResultsTableViewProps {
  searchResults: SearchResults<any>;
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
