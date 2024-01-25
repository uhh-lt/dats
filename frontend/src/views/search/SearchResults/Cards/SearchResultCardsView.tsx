import { Box } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { useParams } from "react-router-dom";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SearchResults,
  SentenceSimilaritySearchResults,
} from "../../../../api/SearchHooks";
import { ColumnInfo_SearchColumns_ } from "../../../../api/openapi";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";
import SearchResultContextMenu from "../SearchResultContextMenu";
import LexicalSearchResultCard from "./LexicalSearchResultCard";
import SentenceSimilaritySearchResultCard from "./SentenceSimilaritySearchResultCard";
import ImageSimilaritySearchResultCard from "./ImageSimilaritySearchResultCard";

interface SearchResultCardsViewProps {
  searchResults: SearchResults<any>;
  handleResultClick: (sdocId: number) => void;
  columnInfo: ColumnInfo_SearchColumns_[];
}

export default function SearchResultCardsView({
  searchResults,
  handleResultClick,
  columnInfo,
}: SearchResultCardsViewProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const { width, height, ref } = useResizeDetector();

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const page = useAppSelector((state) => state.search.page);
  const rowsPerPage = useAppSelector((state) => state.search.rowsPerPage);
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

  // calculate cards per page
  React.useLayoutEffect(() => {
    if (searchResults instanceof SentenceSimilaritySearchResults) {
      dispatch(SearchActions.setRowsPerPage(5));
    } else if (width && height) {
      let numCardsX = Math.floor(width / 300);
      numCardsX = width - numCardsX * 300 - (numCardsX - 1) * 15 > 0 ? numCardsX : numCardsX - 1;

      let numCardsY = Math.floor(height / 370);
      numCardsY = height - numCardsY * 370 - (numCardsY - 1) * 15 > 0 ? numCardsY : numCardsY - 1;

      dispatch(SearchActions.setRowsPerPage(numCardsX * numCardsY));
    }
  }, [dispatch, width, height, searchResults]);

  // handle selection
  const handleChange = useCallback(
    (event: React.ChangeEvent<unknown>, sdocId: number) => {
      event.stopPropagation();
      dispatch(SearchActions.toggleDocument(sdocId));
    },
    [dispatch],
  );

  // render
  return (
    <Box
      ref={ref}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        placeContent: "flex-start",
        gap: "16px",
        overflowY: "auto",
        width: "100%",
        height: "100%",
      }}
    >
      {searchResults instanceof LexicalSearchResults ? (
        searchResults
          .getSearchResultSDocIds()
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((sdocId) => (
            <LexicalSearchResultCard
              key={sdocId}
              sdocId={sdocId}
              handleClick={(sdoc) => handleResultClick(sdoc.id)}
              handleOnContextMenu={openContextMenu}
              handleOnCheckboxChange={handleChange}
            />
          ))
      ) : searchResults instanceof SentenceSimilaritySearchResults ? (
        Array.from(searchResults.getResults().entries())
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map(([sdocId, hits]) => (
            <SentenceSimilaritySearchResultCard
              hits={hits}
              sdocId={sdocId}
              handleClick={(sdoc) => handleResultClick(sdoc.id)}
              handleOnContextMenu={openContextMenu}
              handleOnCheckboxChange={handleChange}
            />
          ))
      ) : searchResults instanceof ImageSimilaritySearchResults ? (
        searchResults
          .getResults()
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((hit) => (
            <ImageSimilaritySearchResultCard
              hit={hit}
              sdocId={hit.sdoc_id}
              handleClick={(sdoc) => handleResultClick(sdoc.id)}
              handleOnContextMenu={openContextMenu}
              handleOnCheckboxChange={handleChange}
            />
          ))
      ) : (
        <></>
      )}
      <SearchResultContextMenu
        projectId={projectId}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </Box>
  );
}
