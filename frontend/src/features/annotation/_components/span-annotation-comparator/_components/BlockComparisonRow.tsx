import { CodeMap } from "@api/hooks/CodeHooks";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, IconButton, Stack } from "@mui/material";
import { memo, MouseEvent, useMemo } from "react";
import { IToken } from "../../../_types/IToken";
import { BlockContent } from "./BlockContent";
import { RenderBlock } from "../_hooks/useBlockPartition";

interface BlockComparisonRowProps {
  block: RenderBlock;
  sentenceTokenIds: number[][];
  leftTokenData: IToken[] | undefined;
  leftAnnotationsPerToken: Map<number, number[]> | undefined;
  leftAnnotationMap: Map<number, SpanAnnotationRead> | undefined;
  rightTokenData: IToken[] | undefined;
  rightAnnotationsPerToken: Map<number, number[]> | undefined;
  rightAnnotationMap: Map<number, SpanAnnotationRead> | undefined;
  leftAnnotationsList: SpanAnnotationRead[];
  rightAnnotationsList: SpanAnnotationRead[];
  isAnnotationAllowedLeft: boolean;
  handleApplyAnnotation: (annotation: SpanAnnotationRead) => void;
  handleRevertAnnotation: (annotation: SpanAnnotationRead) => void;
  setHoveredControlKey: (key: string | null) => void;
  handleLeftMouseUp: (event: MouseEvent) => void;
  handleRightMouseUp: (event: MouseEvent) => void;
  codeMap: CodeMap;
  projectId: number;
}

/**
 * BlockComparisonRow renders a side-by-side comparison row for a given HTML block.
 *
 * It contains:
 * - Left column: The left user's parsed block text and annotations (BlockContent).
 * - Middle column: Interactive annotation copy/revert controls mapped by annotation bounds and code IDs.
 * - Right column: The right user's parsed block text and annotations (BlockContent).
 */
export const BlockComparisonRow = memo(
  ({
    block,
    sentenceTokenIds,
    leftTokenData,
    leftAnnotationsPerToken,
    leftAnnotationMap,
    rightTokenData,
    rightAnnotationsPerToken,
    rightAnnotationMap,
    leftAnnotationsList,
    rightAnnotationsList,
    isAnnotationAllowedLeft,
    handleApplyAnnotation,
    handleRevertAnnotation,
    setHoveredControlKey,
    handleLeftMouseUp,
    handleRightMouseUp,
    codeMap,
    projectId,
  }: BlockComparisonRowProps) => {
    const blockTokenIds = useMemo(() => {
      return block.sentenceIds.flatMap((sentId) => sentenceTokenIds[sentId] || []);
    }, [block.sentenceIds, sentenceTokenIds]);

    // Find annotations starting in this block
    const rightAnnos = useMemo(() => {
      return rightAnnotationsList.filter((anno) => blockTokenIds.includes(anno.begin_token));
    }, [rightAnnotationsList, blockTokenIds]);

    const leftAnnos = useMemo(() => {
      return leftAnnotationsList.filter((anno) => blockTokenIds.includes(anno.begin_token));
    }, [leftAnnotationsList, blockTokenIds]);

    // Match them into control items for this row
    const rowControlItems = useMemo(() => {
      const items: {
        key: string;
        annotationRight?: SpanAnnotationRead;
        annotationLeft?: SpanAnnotationRead;
        isApplied: boolean;
        codeId: number;
      }[] = [];

      const matchedLeftIds = new Set<number>();

      rightAnnos.forEach((rightAnno) => {
        const matchingLeft = leftAnnos.find(
          (leftAnno) =>
            leftAnno.begin_token === rightAnno.begin_token &&
            leftAnno.end_token === rightAnno.end_token &&
            leftAnno.code_id === rightAnno.code_id,
        );

        if (matchingLeft) {
          matchedLeftIds.add(matchingLeft.id);
        }

        items.push({
          key: `r-${rightAnno.id}`,
          annotationRight: rightAnno,
          annotationLeft: matchingLeft,
          isApplied: !!matchingLeft,
          codeId: rightAnno.code_id,
        });
      });

      leftAnnos.forEach((leftAnno) => {
        if (matchedLeftIds.has(leftAnno.id)) return;
        items.push({
          key: `l-${leftAnno.id}`,
          annotationLeft: leftAnno,
          isApplied: false,
          codeId: leftAnno.code_id,
        });
      });

      return items;
    }, [rightAnnos, leftAnnos]);

    return (
      <Box
        display="flex"
        flexDirection="row"
        width="100%"
        sx={{
          py: 1.5,
          borderBottom: "1px solid #e8eaed",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.01)",
          },
        }}
      >
        {/* Left Column */}
        <Box
          sx={{ flexGrow: 1, flexBasis: 0, paddingRight: 2, display: "flex", flexWrap: "wrap", alignItems: "baseline" }}
          onMouseUp={handleLeftMouseUp}
        >
          <BlockContent
            html={block.html}
            tokenData={leftTokenData}
            annotationsPerToken={leftAnnotationsPerToken}
            annotationMap={leftAnnotationMap}
            projectId={projectId}
          />
        </Box>

        {/* Middle Controls (164px) */}
        <Box
          style={{
            width: 164,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px solid #e8eaed",
            borderRight: "1px solid #e8eaed",
            backgroundColor: "rgba(0, 0, 0, 0.01)",
            minHeight: 35,
            padding: "4px 0",
          }}
        >
          <Stack spacing={0.5} justifyContent="center" alignItems="center">
            {rowControlItems.map((item) => {
              const code = codeMap[item.codeId];
              return (
                <Box
                  key={item.key}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 30,
                  }}
                  onMouseEnter={() => setHoveredControlKey(item.key)}
                  onMouseLeave={() => setHoveredControlKey(null)}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center">
                    {isAnnotationAllowedLeft ? (
                      <>
                        <IconButton
                          sx={{ p: 0.25 }}
                          disabled={item.isApplied || !item.annotationRight}
                          onClick={() => item.annotationRight && handleApplyAnnotation(item.annotationRight)}
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.25 }}
                          disabled={!item.annotationLeft}
                          onClick={() => item.annotationLeft && handleRevertAnnotation(item.annotationLeft)}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        {code && <SquareIcon style={{ color: code.color }} fontSize="small" />}
                      </>
                    ) : (
                      <>
                        {code && <SquareIcon style={{ color: code.color }} fontSize="small" />}
                        <IconButton
                          sx={{ p: 0.25 }}
                          disabled={!item.annotationLeft}
                          onClick={() => item.annotationLeft && handleRevertAnnotation(item.annotationLeft)}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.25 }}
                          disabled={item.isApplied || !item.annotationRight}
                          onClick={() => item.annotationRight && handleApplyAnnotation(item.annotationRight)}
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Right Column */}
        <Box
          sx={{ flexGrow: 1, flexBasis: 0, paddingLeft: 2, display: "flex", flexWrap: "wrap", alignItems: "baseline" }}
          onMouseUp={handleRightMouseUp}
        >
          <BlockContent
            html={block.html}
            tokenData={rightTokenData}
            annotationsPerToken={rightAnnotationsPerToken}
            annotationMap={rightAnnotationMap}
            projectId={projectId}
          />
        </Box>
      </Box>
    );
  },
);

BlockComparisonRow.displayName = "BlockComparisonRow";
