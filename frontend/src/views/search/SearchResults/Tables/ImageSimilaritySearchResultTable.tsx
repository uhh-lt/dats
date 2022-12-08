import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ToggleAllDocumentsButton from "../../ToolBar/ToolBarElements/ToggleAllDocumentsButton";
import { TableContainerProps } from "@mui/material/TableContainer";
import { useCallback, useMemo, useState } from "react";
import { ImageSimilaritySearchResults } from "../../../../api/SearchHooks";
import { SearchResultEventHandlerProps } from "../SearchResultProps";
import ImageSimilaritySearchResultTableRow from "./ImageSimilaritySearchResultTableRow";

interface ImageSimilaritySearchResultTableProps {
  searchResults: ImageSimilaritySearchResults;
  page: number;
  rowsPerPage: number;
  children?: React.ReactNode;
}

function ImageSimilaritySearchResultTable({
  children,
  page,
  rowsPerPage,
  searchResults,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: ImageSimilaritySearchResultTableProps & SearchResultEventHandlerProps & TableContainerProps) {
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
    () => (page > 0 ? Math.max(0, (1 + page) * rowsPerPage - searchResults.getNumberOfHits()) : 0),
    [searchResults, page, rowsPerPage]
  );

  return (
    <TableContainer sx={{ width: "100%", overflowX: "hidden" }} {...props}>
      <Table sx={{ tableLayout: "fixed", whiteSpace: "nowrap" }} aria-labelledby="tableTitle" size={"medium"}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" style={{ width: "48px" }}>
              <ToggleAllDocumentsButton sdocIds={searchResults.getSearchResultSDocIds()} />
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
          {Array.from(searchResults.getResults().values())
            .flat()
            .sort((a, b) => b.score - a.score)
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((hit) => (
              <ImageSimilaritySearchResultTableRow
                key={hit.sdoc_id}
                sdocId={hit.sdoc_id}
                hit={hit}
                handleClick={handleClick}
                handleOnContextMenu={handleOnContextMenu}
                handleOnCheckboxChange={handleOnCheckboxChange}
              />
            ))}
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

export default ImageSimilaritySearchResultTable;
