import { Container, Typography } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { useParams } from "react-router-dom";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SearchResults,
  SentenceSimilaritySearchResults,
} from "../../../api/SearchHooks";
import { SourceDocumentRead } from "../../../api/openapi";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import ImageSimilaritySearchResultCard from "./Cards/ImageSimilaritySearchResultCard";
import LexicalSearchResultCard from "./Cards/LexicalSearchResultCard";
import SentenceSimilaritySearchResultCard from "./Cards/SentenceSimilaritySearchResultCard";
import SearchResultContextMenu from "./SearchResultContextMenu";
import "./SearchResults.css";
import SearchResultsTableView from "./SearchResultsTableView";

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
  const dispatch = useAppDispatch();
  const isTableView = useAppSelector((state) => state.search.isTableView);
  const tableViewPaginationModel = useAppSelector((state) => state.search.tableViewPaginationModel);
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
    if (searchResults instanceof SentenceSimilaritySearchResults) {
      dispatch(SearchActions.setRowsPerPage(searchResults.getAggregatedNumberOfHits()));
      return;
    }
    if (width && height) {
      if (!isTableView) {
        let numCardsX = Math.floor(width / 300);
        numCardsX = width - numCardsX * 300 - (numCardsX - 1) * 15 > 0 ? numCardsX : numCardsX - 1;

        let numCardsY = Math.floor(height / 370);
        numCardsY = height - numCardsY * 370 - (numCardsY - 1) * 15 > 0 ? numCardsY : numCardsY - 1;
        if (page * rowsPerPage + 1 >= searchResults.getSearchResultSDocIds().length) {
          dispatch(SearchActions.setPage(0));
          dispatch(SearchActions.setRowsPerPage(searchResults.getSearchResultSDocIds().length));
        } else dispatch(SearchActions.setRowsPerPage(numCardsX * numCardsY));
      } else {
        const sdocIdsLen = searchResults.getSearchResultSDocIds().length;
        const estimatedRowHeight = 100;

        let numRows = Math.floor(height / estimatedRowHeight);
        numRows = height - numRows * estimatedRowHeight - (numRows - 1) * 15 > 0 ? numRows : numRows - 1;
        dispatch(SearchActions.setRowsPerPage(numRows));
        dispatch(
          SearchActions.setTableViewPaginationModel({
            page: numRows >= sdocIdsLen ? 0 : tableViewPaginationModel.page,
            pageSize: numRows,
          })
        );
      }
      return;
    }
  }, [dispatch, width, height, searchResults, isTableView, tableViewPaginationModel.page, page, rowsPerPage]);

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
  const isSentenceSimilaritySearchResult = searchResults instanceof SentenceSimilaritySearchResults;

  if (searchResults instanceof LexicalSearchResults) {
    if (!isTableView) {
      resultsView = (
        <>
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
        </>
      );
    } else {
      resultsView = (
        <SearchResultsTableView
          searchResults={searchResults}
          handleResultClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    }
  } else if (searchResults instanceof SentenceSimilaritySearchResults) {
    if (!isTableView) {
      resultsView = (
        <>
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
        </>
      );
    } else {
      resultsView = (
        <SearchResultsTableView
          searchResults={searchResults}
          handleResultClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    }
  } else if (searchResults instanceof ImageSimilaritySearchResults) {
    if (!isTableView) {
      resultsView = (
        <>
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
        </>
      );
    } else {
      resultsView = (
        <SearchResultsTableView
          searchResults={searchResults}
          handleResultClick={handleResultClick}
          handleOnContextMenu={openContextMenu}
          handleOnCheckboxChange={handleChange}
        />
      );
    }
  } else {
    resultsView = <>Search Result Type is not supported :(</>;
  }

  return (
    <Container
      ref={ref}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        placeContent: "flex-start",
        gap: "15px",
        overflowY: "auto",
        p: 2,
        width: "100%",
        maxWidth: isSentenceSimilaritySearchResult ? undefined : "100% !important",
      }}
      className={className}
    >
      {resultsView}
      <SearchResultContextMenu
        projectId={projectId}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </Container>
  );
}
