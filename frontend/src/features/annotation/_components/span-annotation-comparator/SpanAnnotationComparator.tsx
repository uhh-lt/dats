import { CodeHooks } from "@api/hooks/CodeHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { FAKE_ANNOTATION_ID, SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { queryClient } from "@api/queryClient";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { UserRenderer } from "@core/user";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { Box, BoxProps, Button, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SYSTEM_USER_ID } from "@utils/GlobalConstants";
import { memo, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { useComputeTokenData } from "../../_hooks/useComputeTokenData";
import { Annotation } from "../../_types/Annotation";
import { AnnoActions } from "../../store/annoSlice";
import { AnnotationMenu, AnnotationMenuHandle } from "../annotation-menu";
import { BlockComparisonRow } from "./_components/BlockComparisonRow";
import { useBlockPartition } from "./_hooks/useBlockPartition";

const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};

interface SpanAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
}

/**
 * SpanAnnotationComparison displays a side-by-side view comparing span annotations
 * between two users for a given document.
 *
 * Key features:
 * - Content is grouped by logical block elements (e.g. paragraphs, headings, blockquotes)
 *   retaining the document's original HTML structure and styling.
 * - Virtualized list rendering (via @tanstack/react-virtual) for performance with large documents.
 * - In-place copying/reverting of span annotations via the centered middle controls column.
 * - Synchronized highlight states on hovering over middle column buttons.
 * - Supports normal text and unstyled documents by falling back to sentence elements.
 */
export const SpanAnnotationComparison = memo(({ sdocData, ...props }: SpanAnnotationComparisonProps & BoxProps) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const openSnackbar = useOpenSnackbar();
  const openConfirmationDialog = useOpenConfirmationDialog();

  // global client state (URL search params)
  const { visibleUserId: leftUserId, compareWithUserId: rightUserId } = AnnotationRouteAPI.useSearch();
  const effectiveLeftUserId = leftUserId ?? user?.id;
  const effectiveRightUserId = rightUserId;

  const isAnnotationAllowedLeft = effectiveLeftUserId === user?.id;

  // Redux state
  const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);

  // Popover menu refs
  const leftSpanMenuRef = useRef<AnnotationMenuHandle>(null);

  // State for hover sync
  const [hoveredControlKey, setHoveredControlKey] = useState<string | null>(null);

  // Container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Mutator hooks for span annotations
  const createMutation = SpanAnnotationHooks.useCreateSpanAnnotation(user);
  const createBulkMutation = SpanAnnotationHooks.useCreateBulkAnnotations();
  const updateMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();
  const deleteBulkMutation = SpanAnnotationHooks.useDeleteBulkSpanAnnotation();

  // Compute token data and maps
  const {
    tokenData: leftTokenData,
    annotationsPerToken: leftAnnotationsPerToken,
    annotationMap: leftAnnotationMap,
  } = useComputeTokenData({ sdocData, userId: effectiveLeftUserId });

  const {
    tokenData: rightTokenData,
    annotationsPerToken: rightAnnotationsPerToken,
    annotationMap: rightAnnotationMap,
  } = useComputeTokenData({ sdocData, userId: effectiveRightUserId });

  const codeMap = CodeHooks.useGetAllCodesMap();

  // Fake annotation state for creating new annotations in left panel
  const [fakeAnnotation, setFakeAnnotation] = useState<SpanAnnotationCreate | undefined>(undefined);

  const projectId = useAppSelector((state) => state.project.projectId) ?? -1;

  // Parse HTML and partition into RenderBlocks using custom hook
  const { renderBlocks, sentenceTokenIds } = useBlockPartition(sdocData.html);

  // Virtualization configuration
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: renderBlocks.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Collect all left & right annotations
  const leftAnnotationsList = useMemo(() => {
    if (!leftAnnotationMap) return [];
    return Array.from(leftAnnotationMap.values());
  }, [leftAnnotationMap]);

  const rightAnnotationsList = useMemo(() => {
    if (!rightAnnotationMap) return [];
    return Array.from(rightAnnotationMap.values());
  }, [rightAnnotationMap]);

  // Synchronize hover state to target actual span annotations on both sides
  useEffect(() => {
    const previous = document.querySelectorAll(".span-hovered");
    previous.forEach((el) => el.classList.remove("span-hovered"));

    if (hoveredControlKey) {
      const leftId = hoveredControlKey.startsWith("l-") ? parseInt(hoveredControlKey.substring(2)) : null;
      const rightId = hoveredControlKey.startsWith("r-") ? parseInt(hoveredControlKey.substring(2)) : null;

      if (leftId) {
        const leftEls = document.querySelectorAll(`.span-${leftId}`);
        leftEls.forEach((el) => el.classList.add("span-hovered"));
      } else if (rightId) {
        const rightEls = document.querySelectorAll(`.span-${rightId}`);
        rightEls.forEach((el) => el.classList.add("span-hovered"));

        // Also check if this right annotation has a matching left annotation
        const rightAnno = rightAnnotationsList.find((a) => a.id === rightId);
        if (rightAnno) {
          const leftAnno = leftAnnotationsList.find(
            (leftAnno) =>
              leftAnno.begin_token === rightAnno.begin_token &&
              leftAnno.end_token === rightAnno.end_token &&
              leftAnno.code_id === rightAnno.code_id,
          );
          if (leftAnno) {
            const leftEls = document.querySelectorAll(`.span-${leftAnno.id}`);
            leftEls.forEach((el) => el.classList.add("span-hovered"));
          }
        }
      }
    }
  }, [hoveredControlKey, leftAnnotationsList, rightAnnotationsList]);

  // Single annotation actions
  const handleApplyAnnotation = useCallback(
    (annotation: SpanAnnotationRead) => {
      createMutation.mutate({
        sdoc_id: annotation.sdoc_id,
        code_id: annotation.code_id,
        begin: annotation.begin,
        end: annotation.end,
        begin_token: annotation.begin_token,
        end_token: annotation.end_token,
        span_text: annotation.text,
      });
    },
    [createMutation],
  );

  const handleRevertAnnotation = useCallback(
    (annotation: SpanAnnotationRead) => {
      deleteMutation.mutate({ spanAnnotationToDelete: annotation });
    },
    [deleteMutation],
  );

  // Bulk annotation actions
  const handleApplyAll = () => {
    const missingAnnotations = rightAnnotationsList.filter(
      (rightAnno) =>
        !leftAnnotationsList.some(
          (leftAnno) =>
            leftAnno.begin_token === rightAnno.begin_token &&
            leftAnno.end_token === rightAnno.end_token &&
            leftAnno.code_id === rightAnno.code_id,
        ),
    );

    if (missingAnnotations.length === 0) return;

    const toCreate: SpanAnnotationCreate[] = missingAnnotations.map((anno) => ({
      sdoc_id: sdocData.id,
      code_id: anno.code_id,
      begin: anno.begin,
      end: anno.end,
      begin_token: anno.begin_token,
      end_token: anno.end_token,
      span_text: anno.text,
    }));

    createBulkMutation.mutate({ requestBody: toCreate });
  };

  const handleRevertAll = () => {
    const matchingAnnotations = leftAnnotationsList.filter((leftAnno) =>
      rightAnnotationsList.some(
        (rightAnno) =>
          leftAnno.begin_token === rightAnno.begin_token &&
          leftAnno.end_token === rightAnno.end_token &&
          leftAnno.code_id === rightAnno.code_id,
      ),
    );

    if (matchingAnnotations.length === 0) return;

    const idsToDelete = matchingAnnotations.map((anno) => anno.id);
    deleteBulkMutation.mutate({ requestBody: idsToDelete });
  };

  // Left pane menu click and selection handlers (for editing left user's annotations)
  const handleLeftMenu = useCallback(
    (event: MouseEvent) => {
      if (!leftAnnotationsPerToken || !leftAnnotationMap) return;

      let target: HTMLElement = event.target as HTMLElement;
      let found = false;
      for (let i = 0; i < 3; i++) {
        if (target && target.classList.contains("tok") && target.childElementCount > 0) {
          found = true;
          break;
        }
        if (target.parentElement) {
          target = target.parentElement;
        } else {
          break;
        }
      }
      if (!found) return;

      event.preventDefault();

      const tokenIndex = parseInt(target.getAttribute("data-tokenid")!);
      const annos = leftAnnotationsPerToken.get(tokenIndex);

      if (annos) {
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };

        leftSpanMenuRef.current!.open(
          position,
          annos.map((a) => leftAnnotationMap.get(a)!),
        );
      }
    },
    [leftAnnotationMap, leftAnnotationsPerToken],
  );

  const handleLeftMouseUp = useCallback(
    async (event: MouseEvent) => {
      if (event.button === 2 || !leftTokenData || !isAnnotationAllowedLeft) return;

      const selection = window.getSelection();
      if (!selection || selectionIsEmpty(selection)) {
        handleLeftMenu(event);
        return;
      }

      if (!mostRecentCodeId && !selectedCodeId) {
        openSnackbar({
          severity: "warning",
          text: "Select a code in the Code Explorer (left) first!",
        });
        selection.empty();
        return;
      }

      let selectionStartElement = selection.anchorNode?.parentElement;
      let selectionEndElement = selection.focusNode?.parentElement;

      while (selectionStartElement && selectionStartElement.getAttribute("data-tokenid") === null) {
        selectionStartElement = selectionStartElement.parentElement;
      }

      while (selectionEndElement && selectionEndElement.getAttribute("data-tokenid") === null) {
        selectionEndElement = selectionEndElement.parentElement;
      }

      const selectionStart = selectionStartElement?.getAttribute("data-tokenid");
      const selectionEnd = selectionEndElement?.getAttribute("data-tokenid");
      if (!selectionStart || !selectionEnd) return;

      const begin = parseInt(selectionStart);
      const end = parseInt(selectionEnd);

      selectionStartElement = end < begin ? selectionEndElement : selectionStartElement;
      const begin_token = end < begin ? end : begin;
      const end_token = end < begin ? begin : end;

      const span_text = leftTokenData
        .slice(begin_token, end_token + 1)
        .map((t) => t.text)
        .join(" ");

      const requestBody: SpanAnnotationCreate = {
        code_id: mostRecentCodeId || selectedCodeId || -1,
        sdoc_id: sdocData.id,
        begin: leftTokenData[begin_token].beginChar,
        end: leftTokenData[end_token].endChar,
        begin_token: begin_token,
        end_token: end_token + 1,
        span_text: span_text,
      };

      setFakeAnnotation(requestBody);

      const affectedQueryKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, requestBody.sdoc_id, effectiveLeftUserId];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });

      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        const spanAnnotation: SpanAnnotationRead = {
          ...requestBody,
          id: FAKE_ANNOTATION_ID,
          text: requestBody.span_text,
          code_id: requestBody.code_id,
          created: "",
          updated: "",
          user_id: user?.id || SYSTEM_USER_ID,
          group_ids: [],
          memo_ids: [],
        };
        return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
      });

      const target = selectionStartElement;
      if (target) {
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };
        leftSpanMenuRef.current!.open(position);
      }

      selection.empty();
    },
    [
      leftTokenData,
      isAnnotationAllowedLeft,
      mostRecentCodeId,
      selectedCodeId,
      sdocData.id,
      effectiveLeftUserId,
      handleLeftMenu,
      openSnackbar,
      user?.id,
    ],
  );

  // Left pane menu action handlers
  const handleLeftCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
    openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotation.id}? You can reassign it later!`,
      type: "DELETE",
      onAccept: () => {
        deleteMutation.mutate({ spanAnnotationToDelete: annotation as SpanAnnotationRead });
      },
    });
  };

  const handleLeftCodeSelectorEditCode = (annotation: Annotation, codeId: number) => {
    updateMutation.mutate({
      spanAnnotationToUpdate: annotation as SpanAnnotationRead,
      requestBody: {
        code_id: codeId,
      },
    });
  };

  const handleLeftCodeSelectorAddCode = (codeId: number, isNewCode: boolean) => {
    if (!fakeAnnotation) return;
    createMutation.mutate(
      {
        ...fakeAnnotation,
        code_id: codeId,
      },
      {
        onSuccess: () => {
          if (!isNewCode) {
            dispatch(AnnoActions.moveCodeToTop(codeId));
          }
        },
      },
    );
  };

  const handleLeftCodeSelectorDuplicateAnnotation = (annotation: Annotation, codeId: number) => {
    if ("id" in annotation && "begin_token" in annotation && "end_token" in annotation) {
      const fakeAnnotation: SpanAnnotationCreate = {
        begin: annotation.begin,
        end: annotation.end,
        begin_token: annotation.begin_token,
        end_token: annotation.end_token,
        span_text: annotation.text,
        sdoc_id: annotation.sdoc_id,
        code_id: codeId,
      };
      createMutation.mutate(fakeAnnotation, {
        onSuccess: () => {
          dispatch(AnnoActions.moveCodeToTop(codeId));
        },
      });
    }
  };

  const handleLeftCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    if (fakeAnnotation) {
      if (reason === "backdropClick") {
        createMutation.mutate(
          { ...fakeAnnotation },
          {
            onSuccess: () => {
              dispatch(AnnoActions.moveCodeToTop(fakeAnnotation.code_id));
            },
          },
        );
      }
      if (reason === "escapeKeyDown") {
        queryClient.setQueryData<SpanAnnotationRead[]>(
          [QueryKey.SDOC_SPAN_ANNOTATIONS, fakeAnnotation.sdoc_id, effectiveLeftUserId],
          (old) => old?.filter((spanAnnotation) => spanAnnotation.id !== -1),
        );
      }
    }
    setFakeAnnotation(undefined);
  };

  const showBulkActions = isAnnotationAllowedLeft && effectiveRightUserId !== undefined;

  if (!codeMap.data) return null;

  return (
    <>
      <style>{`
          .span-hovered {
            background-color: rgba(25, 118, 210, 0.2) !important;
            border-bottom: 2px solid #1976d2 !important;
            transition: background-color 0.15s ease;
          }
        `}</style>
      <AnnotationMenu
        ref={leftSpanMenuRef}
        onAdd={handleLeftCodeSelectorAddCode}
        onClose={handleLeftCodeSelectorClose}
        onEdit={handleLeftCodeSelectorEditCode}
        onDelete={handleLeftCodeSelectorDeleteAnnotation}
        onDuplicate={handleLeftCodeSelectorDuplicateAnnotation}
      />
      <Box {...props} display="flex" flexDirection="column" height="100%">
        {/* Header Row */}
        <Stack direction="row" width="100%" sx={{ mb: 2, borderBottom: "1px solid #e8eaed", pb: 1, flexShrink: 0 }}>
          {/* Left Column Header */}
          <Box sx={{ flexGrow: 1, flexBasis: 0, display: "flex", alignItems: "center", pl: 2 }}>
            <Typography variant="h6">
              {effectiveLeftUserId ? (
                <Stack direction="row" alignItems="center" gap={1}>
                  <UserRenderer user={effectiveLeftUserId} />
                  {"'s Annotations"}
                </Stack>
              ) : (
                "Select user first"
              )}
            </Typography>
          </Box>

          {/* Middle Header (Bulk Actions) */}
          {showBulkActions && (
            <Box sx={{ width: 164, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Stack direction="row" alignItems="center">
                {isAnnotationAllowedLeft ? (
                  <Button size="small" onClick={handleApplyAll}>
                    Apply
                  </Button>
                ) : (
                  <Button size="small" onClick={handleRevertAll}>
                    Revert
                  </Button>
                )}
                <Typography variant="button" color="primary">
                  |
                </Typography>
                {isAnnotationAllowedLeft ? (
                  <Button size="small" onClick={handleRevertAll}>
                    Revert
                  </Button>
                ) : (
                  <Button size="small" onClick={handleApplyAll}>
                    Apply
                  </Button>
                )}
                <Typography variant="button" color="primary" sx={{ pr: 1 }}>
                  All
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Right Column Header */}
          <Box sx={{ flexGrow: 1, flexBasis: 0, display: "flex", alignItems: "center", pl: 2 }}>
            <Typography variant="h6">
              {effectiveRightUserId ? (
                <Stack direction="row" alignItems="center" gap={1}>
                  <UserRenderer user={effectiveRightUserId} />
                  {"'s Annotations"}
                </Stack>
              ) : (
                "Select user first"
              )}
            </Typography>
          </Box>
        </Stack>

        {/* Document Content Side-by-Side Virtualized rows */}
        <Box
          ref={scrollContainerRef}
          style={{
            flexGrow: 1,
            overflowY: "auto",
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const blockIndex = item.index;
              const block = renderBlocks[blockIndex];
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  <BlockComparisonRow
                    block={block}
                    sentenceTokenIds={sentenceTokenIds}
                    leftTokenData={leftTokenData}
                    leftAnnotationsPerToken={leftAnnotationsPerToken}
                    leftAnnotationMap={leftAnnotationMap}
                    rightTokenData={rightTokenData}
                    rightAnnotationsPerToken={rightAnnotationsPerToken}
                    rightAnnotationMap={rightAnnotationMap}
                    leftAnnotationsList={leftAnnotationsList}
                    rightAnnotationsList={rightAnnotationsList}
                    isAnnotationAllowedLeft={isAnnotationAllowedLeft}
                    handleApplyAnnotation={handleApplyAnnotation}
                    handleRevertAnnotation={handleRevertAnnotation}
                    setHoveredControlKey={setHoveredControlKey}
                    handleLeftMouseUp={handleLeftMouseUp}
                    handleRightMouseUp={() => {}}
                    codeMap={codeMap.data || {}}
                    projectId={projectId}
                  />
                </div>
              );
            })}
          </div>
        </Box>
      </Box>
    </>
  );
});
