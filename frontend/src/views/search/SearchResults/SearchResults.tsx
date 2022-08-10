import * as React from "react";
import { useCallback, useMemo } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { Box, Typography } from "@mui/material";
import SearchResultContextMenu, { ContextMenuData } from "./SearchResultContextMenu";
import "./SearchResults.css";
import { SourceDocumentRead } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import SearchResultRow from "./SearchResultRow";
import SearchResultCard from "./SearchResultCard";

interface SearchResultsNewProps {
  page: number;
  rowsPerPage: number;
  documentIds: number[];
  handleResultClick: (sdoc: SourceDocumentRead) => void;
}

export default function SearchResults({ page, rowsPerPage, documentIds, handleResultClick }: SearchResultsNewProps) {
  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isListView = useAppSelector((state) => state.search.isListView);
  const dispatch = useAppDispatch();

  // context menu
  const [contextMenuData, setContextMenuData] = React.useState<ContextMenuData | null>(null);
  const openContextMenu = useCallback(
    (docId: number) => (event: React.MouseEvent) => {
      event.preventDefault();
      if (selectedDocumentIds.indexOf(docId) === -1) {
        dispatch(SearchActions.setSelectedDocuments([docId]));
      }
      setContextMenuData({ x: event.pageX, y: event.pageY });
    },
    [dispatch, selectedDocumentIds]
  );
  const closeContextMenu = useCallback(() => {
    setContextMenuData(null);
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

  return (
    <>
      {documentIds.length === 0 ? (
        <Typography>Keine Suchergebnisse für diese Anfrage...</Typography>
      ) : (
        <>
          {isListView ? (
            <TableContainer sx={{ width: "100%", overflowX: "hidden" }}>
              <Table sx={{ tableLayout: "fixed", whiteSpace: "nowrap" }} aria-labelledby="tableTitle" size={"medium"}>
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
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }}>
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
      <SearchResultContextMenu contextMenuData={contextMenuData} handleClose={closeContextMenu} />
    </>
  );
}
