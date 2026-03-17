import { SimSearchImageHit } from "@api/models/SimSearchImageHit";
import { useTabNavigate } from "@core/navigation";
import { Box, BoxProps, CircularProgress, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback } from "react";
import { useResizeDetector } from "react-resize-detector";
import { ImageSearchActions } from "../../../store/imageSearchSlice";
import { ImageSimilaritySearchResultCard } from "./ImageSimilaritySearchResultCard";

const cardWidth = 298;
const cardWidthWithPadding = cardWidth + 16;
const cardHeight = 340;

interface DocumentTableProps {
  projectId: number;
  data: SimSearchImageHit[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  boxProps?: Omit<BoxProps, "ref">;
}

export function ImageSimilarityView({ projectId, data, isLoading, isFetching, isError, boxProps }: DocumentTableProps) {
  // handle checkbox selection
  const dispatch = useAppDispatch();
  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<unknown>, sdocId: number) => {
      event.stopPropagation();
      dispatch(ImageSearchActions.toggleDocument(sdocId));
    },
    [dispatch],
  );

  // checkbox selection
  const selectedDocumentIds = useAppSelector((state) => state.imageSearch.selectedDocumentIds);

  // handle search selection & navigation
  const tabNavigate = useTabNavigate();
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
  const handleClick = useCallback(
    (event: React.MouseEvent<unknown>, sdocId: number) => {
      if (event.detail >= 2) {
        tabNavigate({
          to: "/project/$projectId/annotation/$sdocId",
          params: { projectId, sdocId },
        });
      } else {
        dispatch(ImageSearchActions.onToggleSelectedDocumentId(sdocId));
      }
    },
    [dispatch, projectId, tabNavigate],
  );

  // compute number of cards per row
  const { width, ref } = useResizeDetector();
  const numCardsX = width ? Math.floor(width / cardWidthWithPadding) : 1;

  // virtualization
  const virtualizer = useVirtualizer({
    count: data ? Math.ceil(data.length / numCardsX) : 0,
    getScrollElement: () => ref.current,
    estimateSize: () => cardHeight,
  });

  return (
    <Box {...boxProps} ref={ref}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {data ? (
          virtualizer.getVirtualItems().map((virtualItem) => (
            <Stack
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              direction="row"
              gap={2}
              pb={2}
              style={{
                width: "100%",
                position: "absolute",
                top: "8px",
                left: "8px",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {[...Array(numCardsX).keys()].map((colIndex) => {
                const hit = data[virtualItem.index * numCardsX + colIndex];
                if (!hit) {
                  return null;
                }

                const isSelected = selectedDocumentId === hit.sdoc_id;
                const isChecked = selectedDocumentIds.indexOf(hit.sdoc_id) !== -1;
                return (
                  <ImageSimilaritySearchResultCard
                    key={hit.sdoc_id}
                    hit={hit}
                    checked={isChecked}
                    handleOnCheckboxChange={(event) => handleCheckboxChange(event, hit.sdoc_id)}
                    handleClick={(event) => handleClick(event, hit.sdoc_id)}
                    raised={isChecked}
                    sx={(theme) => {
                      return {
                        width: cardWidth,
                        height: cardHeight,
                        ...(isSelected && {
                          border: "2px solid",
                          borderColor: theme.palette.primary.light,
                        }),
                      };
                    }}
                  />
                );
              })}
            </Stack>
          ))
        ) : isLoading || isFetching ? (
          <CircularProgress />
        ) : isError ? (
          <Box>Error</Box>
        ) : null}
      </div>
    </Box>
  );
}
