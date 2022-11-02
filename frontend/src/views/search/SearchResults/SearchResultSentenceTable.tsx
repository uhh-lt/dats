import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ToggleAllDocumentsButton from "../ToolBar/ToolBarElements/ToggleAllDocumentsButton";
import { TableContainerProps } from "@mui/material/TableContainer";
import { useCallback, useMemo, useState } from "react";

interface SearchResultSentenceTableProps {
  searchResultDocumentIds: number[];
  numSearchResults: number;
  page: number;
  rowsPerPage: number;
  children?: React.ReactNode;
}

function SearchResultSentenceTable({
  children,
  page,
  rowsPerPage,
  searchResultDocumentIds,
  numSearchResults,
  ...props
}: SearchResultSentenceTableProps & TableContainerProps) {
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

  // computed
  // use empty rows to fill table
  const emptyRows = useMemo(
    () => (page > 0 ? Math.max(0, (1 + page) * rowsPerPage - numSearchResults) : 0),
    [numSearchResults, page, rowsPerPage]
  );

  return (
    <TableContainer sx={{ width: "100%", overflowX: "hidden" }} {...props}>
      <Table sx={{ tableLayout: "fixed", whiteSpace: "nowrap" }} aria-labelledby="tableTitle" size={"medium"}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" style={{ width: "48px" }}>
              <ToggleAllDocumentsButton sdocIds={searchResultDocumentIds} />
            </TableCell>
            <TableCell style={{ width: "48px" }}>Score</TableCell>
            <TableCell style={{ position: "relative", width: `${width}px` }}>
              Document
              <div onMouseDown={handleMouseDown} className={`resizer ${isResizing ? "isResizing" : ""}`}></div>
            </TableCell>
            <TableCell>Sentence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {children}
          {emptyRows > 0 && (
            <TableRow
              style={{
                height: 53 * emptyRows,
              }}
            >
              <TableCell colSpan={4} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default SearchResultSentenceTable;
