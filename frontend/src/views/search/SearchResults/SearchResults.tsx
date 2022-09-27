import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer, { TableContainerProps } from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { Box, TableHead, Typography } from "@mui/material";
import SearchResultContextMenu from "./SearchResultContextMenu";
import "./SearchResults.css";
import { SourceDocumentRead } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import SearchResultRow from "./SearchResultRow";
import SearchResultCard from "./SearchResultCard";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import { useParams } from "react-router-dom";
import ToggleAllDocumentsButton from "../ToolBar/ToolBarElements/ToggleAllDocumentsButton";

interface SearchResultsProps {
  documentIds: number[];
  handleResultClick: (sdoc: SourceDocumentRead) => void;
  className?: string;
}

export default function SearchResults({
  documentIds,
  handleResultClick,
  className,
}: SearchResultsProps & TableContainerProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const page = useAppSelector((state) => state.search.page);
  const rowsPerPage = useAppSelector((state) => state.search.rowsPerPage);
  const isListView = useAppSelector((state) => state.search.isListView);
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
    [dispatch, selectedDocumentIds]
  );
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  // computed
  const emptyRows = useMemo(
    () => (documentIds ? (page > 0 ? Math.max(0, (1 + page) * rowsPerPage - documentIds.length) : 0) : 0),
    [documentIds, page, rowsPerPage]
  );

  // handle selection
  const handleChange = useCallback(
    (event: React.ChangeEvent<unknown>, sdocId: number) => {
      event.stopPropagation();
      dispatch(SearchActions.toggleDocument(sdocId));
    },
    [dispatch]
  );

  // handle resize
  const [width, setWidth] = useState(80);
  const [isResizing, setIsResizing] = useState(false);
  const handleMouseMove = useCallback(
    (event: any) => {
      setWidth((prevWidth) => prevWidth + event.movementX);
    },
    [setWidth]
  );
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  return (
    <>
      {documentIds.length === 0 ? (
        <Typography>No search results for this query...</Typography>
      ) : (
        <>
          {isListView ? (
            <TableContainer sx={{ width: "100%", overflowX: "hidden" }} className={className}>
              <Table sx={{ tableLayout: "fixed", whiteSpace: "nowrap" }} aria-labelledby="tableTitle" size={"medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" style={{ width: "48px" }}>
                      <ToggleAllDocumentsButton searchResultIds={documentIds} />
                    </TableCell>
                    <TableCell style={{ position: "relative", width: `${width}px` }}>
                      Title
                      <div onMouseDown={handleMouseDown} className={`resizer ${isResizing ? "isResizing" : ""}`}></div>
                    </TableCell>
                    <TableCell>Content</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sdocId) => (
                    <SearchResultRow
                      key={sdocId}
                      sdocId={sdocId}
                      handleClick={handleResultClick}
                      handleOnContextMenu={openContextMenu}
                      handleOnCheckboxChange={handleChange}
                    />
                  ))}
                  {emptyRows > 0 && (
                    <TableRow
                      style={{
                        height: 53 * emptyRows,
                      }}
                    >
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }} className={className}>
              {documentIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sdocId) => (
                <SearchResultCard
                  key={sdocId}
                  sdocId={sdocId}
                  handleClick={handleResultClick}
                  handleOnContextMenu={openContextMenu}
                  handleOnCheckboxChange={handleChange}
                />
              ))}
            </Box>
          )}
        </>
      )}
      <SearchResultContextMenu
        projectId={projectId}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </>
  );
}
