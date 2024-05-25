import { Box } from "@mui/material";
import * as React from "react";
import { useCallback, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { useParams } from "react-router-dom";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SentenceSimilaritySearchResults,
} from "../../../../api/SearchHooks.ts";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import ImageSimilaritySearchResultCard from "../../../searchimages/ImageSimilaritySearchResultCard.tsx";
import { SearchActions } from "../../searchSlice.ts";
import SearchResultContextMenu from "../SearchResultContextMenu.tsx";
import LexicalSearchResultCard from "./LexicalSearchResultCard.tsx";
import SentenceSimilaritySearchResultCard from "./SentenceSimilaritySearchResultCard.tsx";

interface SearchResultCardsViewProps {
  searchResults: LexicalSearchResults | SentenceSimilaritySearchResults | ImageSimilaritySearchResults;
  handleResultClick: (sdocId: number) => void;
}

export default function SearchResultCardsView({ searchResults, handleResultClick }: SearchResultCardsViewProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const { width, height, ref } = useResizeDetector();

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const { pageIndex, pageSize } = useAppSelector((state) => state.search.paginationModel);
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

  // calculate cards per pageIndex
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
          .slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
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
          .slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
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
          .slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
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
