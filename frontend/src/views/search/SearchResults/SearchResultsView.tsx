import * as React from "react";
import { useCallback, useState } from "react";
import { TableContainerProps } from "@mui/material/TableContainer";
import { Box, Typography } from "@mui/material";
import SearchResultContextMenu from "./SearchResultContextMenu";
import "./SearchResults.css";
import { SimSearchSentenceHit } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import SearchResultDocumentTableRow from "./SearchResultDocumentTableRow";
import SearchResultCard from "./SearchResultCard";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import { useParams } from "react-router-dom";
import { SearchResults, SearchResultsType } from "../../../api/SearchHooks";
import SentenceResultCard from "./SentenceResultCard";
import SearchResultDocumentTable from "./SearchResultDocumentTable";
import SearchResultSentenceTableRow from "./SearchResultSentenceTableRow";
import SearchResultSentenceTable from "./SearchResultSentenceTable";

interface SearchResultsProps {
  searchResults: SearchResults;
  searchResultDocumentIds: number[];
  numSearchResults: number;
  handleResultClick: (sdocId: number) => void;
  className?: string;
}

export default function SearchResultsView({
  searchResults,
  searchResultDocumentIds,
  numSearchResults,
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
      {searchResultDocumentIds.length === 0 ? (
        <Typography>No search results for this query...</Typography>
      ) : (
        <>
          {searchResults.type === SearchResultsType.DOCUMENTS ? (
            <>
              {isListView ? (
                <SearchResultDocumentTable
                  searchResultDocumentIds={searchResultDocumentIds}
                  numSearchResults={numSearchResults}
                  page={page}
                  rowsPerPage={rowsPerPage}
                >
                  {searchResultDocumentIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sdocId) => (
                    <SearchResultDocumentTableRow
                      key={sdocId}
                      sdocId={sdocId}
                      handleClick={handleResultClick}
                      handleOnContextMenu={openContextMenu}
                      handleOnCheckboxChange={handleChange}
                    />
                  ))}
                </SearchResultDocumentTable>
              ) : (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }}
                  className={className}
                >
                  {searchResultDocumentIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sdocId) => (
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
          ) : searchResults.type === SearchResultsType.SENTENCES ? (
            <>
              {isListView ? (
                <SearchResultSentenceTable
                  searchResultDocumentIds={searchResultDocumentIds}
                  numSearchResults={numSearchResults}
                  page={page}
                  rowsPerPage={rowsPerPage}
                >
                  {Array.from((searchResults.data as Map<number, SimSearchSentenceHit[]>).values())
                    .flat()
                    .sort((a, b) => b.score - a.score)
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((hit) => (
                      <SearchResultSentenceTableRow
                        key={`${hit.sdoc_id}-${hit.sentence_id}`}
                        sdocId={hit.sdoc_id}
                        hit={hit}
                        handleClick={handleResultClick}
                        handleOnContextMenu={openContextMenu}
                        handleOnCheckboxChange={handleChange}
                      />
                    ))}
                </SearchResultSentenceTable>
              ) : (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }}
                  className={className}
                >
                  {Array.from((searchResults.data as Map<number, SimSearchSentenceHit[]>).entries())
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(([sdocId, hits]) => (
                      <SentenceResultCard
                        key={sdocId}
                        sdocId={sdocId}
                        sentenceHits={hits}
                        handleClick={handleResultClick}
                        handleOnContextMenu={openContextMenu}
                        handleOnCheckboxChange={handleChange}
                      />
                    ))}
                </Box>
              )}
            </>
          ) : (
            <>Search Result Type is not supported :(</>
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
