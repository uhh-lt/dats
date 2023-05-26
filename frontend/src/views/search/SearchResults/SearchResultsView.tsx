import * as React from "react";
import { useCallback, useState } from "react";
import { Box, Typography } from "@mui/material";
import SearchResultContextMenu from "./SearchResultContextMenu";
import "./SearchResults.css";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import LexicalSearchResultCard from "./Cards/LexicalSearchResultCard";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import { useParams } from "react-router-dom";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SearchResults,
  SentenceSimilaritySearchResults,
} from "../../../api/SearchHooks";
import SearchResultDocumentTable from "./Tables/SearchResultDocumentTable";
import SearchResultSentenceTable from "./Tables/SearchResultSentenceTable";
import ImageSimilaritySearchResultCard from "./Cards/ImageSimilaritySearchResultCard";
import SentenceSimilaritySearchResultCard from "./Cards/SentenceSimilaritySearchResultCard";
import ImageSimilaritySearchResultTable from "./Tables/ImageSimilaritySearchResultTable";
import { SourceDocumentRead } from "../../../api/openapi";
import { useResizeDetector } from "react-resize-detector";

interface SearchResultsViewProps {
  searchResults: SearchResults<any>;
  handleResultClick: (sdoc: SourceDocumentRead) => void;
  className?: string;
}

export default function SearchResultsView({ searchResults, handleResultClick, className }: SearchResultsViewProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const { width, height, ref } = useResizeDetector();

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

  React.useLayoutEffect(() => {
    if (width && height) {
      let numCardsX = Math.floor(width / 300);
      numCardsX = width - numCardsX * 300 - (numCardsX - 1) * 15 > 0 ? numCardsX : numCardsX - 1;

      let numCardsY = Math.floor(height / 370);
      numCardsY = height - numCardsY * 370 - (numCardsY - 1) * 15 > 0 ? numCardsY : numCardsY - 1;

      console.log("numCardsX: " + numCardsX);
      console.log("numCardsY: " + numCardsY);

      dispatch(SearchActions.setRowsPerPage(numCardsX * numCardsY));
    }
  }, [dispatch, width, height]);

  // handle selection
  const handleChange = useCallback(
    (event: React.ChangeEvent<unknown>, sdocId: number) => {
      event.stopPropagation();
      dispatch(SearchActions.toggleDocument(sdocId));
    },
    [dispatch]
  );

  if (searchResults.getNumberOfHits() === 0) {
    return <Typography>No search results for this query...</Typography>;
  }

  let resultsView = null;

  if (searchResults instanceof LexicalSearchResults) {
    if (isListView) {
      resultsView = (
        <SearchResultDocumentTable
          searchResults={searchResults}
          page={page}
          rowsPerPage={rowsPerPage}
          handleClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    } else {
      resultsView = (
        <Box
          ref={ref}
          sx={{
            display: "flex",
            flexWrap: "wrap",
            placeContent: "flex-start",
            gap: "15px",
            overflowY: "auto",
            p: 2,
            width: "100%",
          }}
          className={className}
        >
          {searchResults
            .getSearchResultSDocIds()
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((sdocId) => (
              <LexicalSearchResultCard
                key={sdocId}
                sdocId={sdocId}
                handleClick={handleResultClick}
                handleOnContextMenu={openContextMenu}
                handleOnCheckboxChange={handleChange}
              />
            ))}
        </Box>
      );
    }
  } else if (searchResults instanceof SentenceSimilaritySearchResults) {
    if (isListView) {
      resultsView = (
        <SearchResultSentenceTable
          searchResults={searchResults}
          page={page}
          rowsPerPage={rowsPerPage}
          handleClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    } else {
      resultsView = (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }} className={className}>
          {Array.from(searchResults.getResults().entries())
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map(([sdocId, hits]) => (
              <SentenceSimilaritySearchResultCard
                key={sdocId}
                sdocId={sdocId}
                hits={hits}
                handleClick={handleResultClick}
                handleOnContextMenu={openContextMenu}
                handleOnCheckboxChange={handleChange}
              />
            ))}
        </Box>
      );
    }
  } else if (searchResults instanceof ImageSimilaritySearchResults) {
    if (isListView) {
      resultsView = (
        <ImageSimilaritySearchResultTable
          searchResults={searchResults}
          page={page}
          rowsPerPage={rowsPerPage}
          handleClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    } else {
      resultsView = (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "16px", overflowY: "auto", p: 2 }} className={className}>
          {searchResults
            .getResults()
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((hit) => (
              <ImageSimilaritySearchResultCard
                key={hit.sdoc_id}
                sdocId={hit.sdoc_id}
                hit={hit}
                handleClick={handleResultClick}
                handleOnContextMenu={openContextMenu}
                handleOnCheckboxChange={handleChange}
              />
            ))}
        </Box>
      );
    }
  } else {
    return <>Search Result Type is not supported :(</>;
  }

  return (
    <>
      {resultsView}
      <SearchResultContextMenu
        projectId={projectId}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </>
  );
}
