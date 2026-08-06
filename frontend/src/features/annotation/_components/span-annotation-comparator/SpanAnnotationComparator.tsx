import { CodeHooks } from "@api/hooks/CodeHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { UserRenderer } from "@core/user";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { Box, BoxProps, Button, Stack, Tooltip, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { toPendingSpanAnnotation } from "../../_hooks/pendingSpanAnnotation";
import { useComputeTokenData, useTokenData } from "../../_hooks/useComputeTokenData";
import { useJumpToSpanAnnotation } from "../../_hooks/useJumpToSpanAnnotation";
import { useSpanAnnotationHighlight } from "../../_hooks/useSpanAnnotationHighlight";
import { useSpanAnnotationResize } from "../../_hooks/useSpanAnnotationResize";
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
 *   - Controls are shown ONLY if one of the selected annotators is the current logged-in user.
 *   - Controls are generated ONLY for the other user's annotations (to copy to, or revert from,
 *     the logged-in user's document). No copy/revert buttons are shown for the logged-in user's
 *     own unique annotations to prevent accidental modification.
 * - Synchronized highlight states on hovering over middle column buttons.
 * - Supports normal text and unstyled documents by falling back to sentence elements.
 */
export const SpanAnnotationComparison = memo(({ sdocData, ...props }: SpanAnnotationComparisonProps & BoxProps) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const openSnackbar = useOpenSnackbar();
  const openConfirmationDialog = useOpenConfirmationDialog();

  // global client state (URL search params)
  const {
    visibleUserId: leftUserId,
    compareWithUserId: rightUserId,
    selectedAnnotationId,
  } = AnnotationRouteAPI.useSearch();
  const effectiveLeftUserId = leftUserId ?? user?.id;
  const effectiveRightUserId = rightUserId;

  const isAnnotationAllowedLeft = effectiveLeftUserId === user?.id;
  const isAnnotationAllowedRight = effectiveRightUserId === user?.id;

  // Redux state
  const mostRecentCodeId = useAppSelector((state) => state.annotations.mostRecentCodeId);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);

  // Popover menu refs
  const leftSpanMenuRef = useRef<AnnotationMenuHandle>(null);
  const rightSpanMenuRef = useRef<AnnotationMenuHandle>(null);

  // State for hover sync
  const [hoveredControlKey, setHoveredControlKey] = useState<string | null>(null);

  // Container ref for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Mutator hooks for span annotations
  const createMutation = SpanAnnotationHooks.useCreateSpanAnnotation();
  const createBulkMutation = SpanAnnotationHooks.useCreateBulkAnnotations();
  const updateMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();
  const deleteBulkMutation = SpanAnnotationHooks.useDeleteBulkSpanAnnotation();

  // Compute token data and maps
  const resizeTokenData = useTokenData(sdocData);
  const leftResizeController = useSpanAnnotationResize(resizeTokenData);
  const rightResizeController = useSpanAnnotationResize(resizeTokenData);
  // the draft annotation whose code-selector menu is currently open (not yet sent), and the side it
  // was created on. Rendered as a preview via its negative pending id on that side only.
  const [draft, setDraft] = useState<{ side: "left" | "right"; annotation: SpanAnnotationRead } | undefined>(undefined);
  // annotations already sent to the server but not yet persisted; kept visible until the real
  // annotation lands in the cache so the highlight never flickers. Keyed by unique negative ids.
  // Only one side is ever editable (the current user's), so all pending annotations belong to it.
  const [pendingAnnotations, setPendingAnnotations] = useState<SpanAnnotationRead[]>([]);

  // the in-flight pending annotations and the draft (menu open) are rendered as previews, but only
  // on the editable side (the current user's side)
  const allPendingAnnotations = useMemo<SpanAnnotationRead[]>(
    () => (draft ? [...pendingAnnotations, draft.annotation] : pendingAnnotations),
    [pendingAnnotations, draft],
  );
  const editableSide: "left" | "right" = isAnnotationAllowedRight && !isAnnotationAllowedLeft ? "right" : "left";
  const leftPendingAnnotations = editableSide === "left" ? allPendingAnnotations : undefined;
  const rightPendingAnnotations = editableSide === "right" ? allPendingAnnotations : undefined;

  const {
    tokenData: leftTokenData,
    annotationsPerToken: leftAnnotationsPerToken,
    annotationMap: leftAnnotationMap,
  } = useComputeTokenData({
    sdocData,
    userId: effectiveLeftUserId,
    annotationOverride: leftResizeController.previewAnnotation,
    pendingAnnotations: leftPendingAnnotations,
  });

  const {
    tokenData: rightTokenData,
    annotationsPerToken: rightAnnotationsPerToken,
    annotationMap: rightAnnotationMap,
  } = useComputeTokenData({
    sdocData,
    userId: effectiveRightUserId,
    annotationOverride: rightResizeController.previewAnnotation,
    pendingAnnotations: rightPendingAnnotations,
  });

  const codeMap = CodeHooks.useGetAllCodesMap();

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

  // Synchronize hover state to target actual span annotations on both sides.
  // Derive the hovered annotation id from the control key (l-<id> / r-<id>) and
  // highlight its tokens via the shared span highlight.
  const hoveredAnnotationId = hoveredControlKey ? parseInt(hoveredControlKey.substring(2)) : null;
  useSpanAnnotationHighlight(hoveredAnnotationId);

  // jump to & highlight the selected annotation
  useSpanAnnotationHighlight(selectedAnnotationId);
  useJumpToSpanAnnotation(selectedAnnotationId, { block: "center" });

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

  // Menu click handler (right-click on a token) for editing a side's annotations.
  // Opens the menu for the annotations under the clicked token on the given side.
  const handleMenu = useCallback(
    (
      event: MouseEvent,
      annotationsPerToken: Map<number, number[]> | undefined,
      annotationMap: Map<number, SpanAnnotationRead> | undefined,
      menuRef: React.RefObject<AnnotationMenuHandle | null>,
    ) => {
      if (!annotationsPerToken || !annotationMap) return;

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
      const annos = annotationsPerToken.get(tokenIndex);

      if (annos) {
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };

        menuRef.current!.open(
          position,
          annos.map((a) => annotationMap.get(a)!),
        );
      }
    },
    [],
  );

  // Builds a mouseup handler for one side ("left" | "right") of the comparator. Both sides support
  // creating annotations on the current user's own annotations; the side determines which token data,
  // resize controller, menu ref and pending-preview are used.
  const createMouseUpHandler = (side: "left" | "right") => {
    const isLeft = side === "left";
    const tokenData = isLeft ? leftTokenData : rightTokenData;
    const annotationsPerToken = isLeft ? leftAnnotationsPerToken : rightAnnotationsPerToken;
    const annotationMap = isLeft ? leftAnnotationMap : rightAnnotationMap;
    const resizeController = isLeft ? leftResizeController : rightResizeController;
    const menuRef = isLeft ? leftSpanMenuRef : rightSpanMenuRef;
    const isAllowed = isLeft ? isAnnotationAllowedLeft : isAnnotationAllowedRight;

    return (event: MouseEvent) => {
      if (resizeController.shouldIgnoreMouseUp()) return;
      if (event.button === 2 || !tokenData) return;

      const selection = window.getSelection();
      if (!selection || selectionIsEmpty(selection)) {
        // right-click / no selection: open the annotation menu for this side's annotations.
        // allowed on both sides so the other user's annotations can be edited via the menu.
        handleMenu(event, annotationsPerToken, annotationMap, menuRef);
        return;
      }

      // a text selection exists: this is annotation creation, only allowed on the current user's side.
      // warn and clear the selection when attempting to annotate on the other user's side.
      if (!isAllowed) {
        openSnackbar({
          severity: "warning",
          text: "You cannot create annotations on another user's document. Switch to your user in the Annotator Selector (top) to create annotations.",
        });
        selection.empty();
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

      const span_text = tokenData
        .slice(begin_token, end_token + 1)
        .map((t) => t.text)
        .join(" ");

      const requestBody: SpanAnnotationCreate = {
        code_id: mostRecentCodeId || selectedCodeId || -1,
        sdoc_id: sdocData.id,
        begin: tokenData[begin_token].beginChar,
        end: tokenData[end_token].endChar,
        begin_token: begin_token,
        end_token: end_token + 1,
        span_text: span_text,
      };

      // store the draft annotation in local state; it is rendered via the pendingAnnotations override
      setDraft({ side, annotation: toPendingSpanAnnotation(requestBody, user?.id) });

      const target = selectionStartElement;
      if (target) {
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };
        menuRef.current!.open(position);
      }

      selection.empty();
    };
  };

  const handleLeftMouseUp = createMouseUpHandler("left");
  const handleRightMouseUp = createMouseUpHandler("right");

  // Menu action handlers (shared by both panes; the menu operates on whichever side's annotations
  // were clicked, and on the draft of whichever side opened it)
  const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
    openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotation.id}? You can reassign it later!`,
      type: "DELETE",
      onAccept: () => {
        deleteMutation.mutate({ spanAnnotationToDelete: annotation as SpanAnnotationRead });
      },
    });
  };

  const handleCodeSelectorEditCode = (annotation: Annotation, codeId: number) => {
    updateMutation.mutate({
      spanAnnotationToUpdate: annotation as SpanAnnotationRead,
      requestBody: {
        code_id: codeId,
      },
    });
  };

  // send a create request and keep the annotation visible (pending) until the real one is cached.
  // `pending` is the local preview annotation; only its create-payload fields are sent to the server.
  const startCreate = (pending: SpanAnnotationRead, codeId: number, onSuccess?: () => void) => {
    const requestBody: SpanAnnotationCreate = {
      code_id: codeId,
      sdoc_id: pending.sdoc_id,
      begin: pending.begin,
      end: pending.end,
      begin_token: pending.begin_token,
      end_token: pending.end_token,
      span_text: pending.text,
    };
    setPendingAnnotations((prev) => [...prev, { ...pending, code_id: codeId }]);
    createMutation.mutate(requestBody, {
      onSuccess,
      // remove the pending preview once the real annotation is in the cache (or the request failed)
      onSettled: () => setPendingAnnotations((prev) => prev.filter((a) => a.id !== pending.id)),
    });
  };

  const handleCodeSelectorAddCode = (codeId: number, isNewCode: boolean) => {
    if (!draft) return;
    startCreate(draft.annotation, codeId, () => {
      if (!isNewCode) {
        dispatch(AnnoActions.moveCodeToTop(codeId));
      }
    });
  };

  const handleCodeSelectorDuplicateAnnotation = (annotation: Annotation, codeId: number) => {
    if ("id" in annotation && "begin_token" in annotation && "end_token" in annotation) {
      const requestBody: SpanAnnotationCreate = {
        begin: annotation.begin,
        end: annotation.end,
        begin_token: annotation.begin_token,
        end_token: annotation.end_token,
        span_text: annotation.text,
        sdoc_id: annotation.sdoc_id,
        code_id: codeId,
      };
      const pending = toPendingSpanAnnotation(requestBody, user?.id);
      startCreate(pending, codeId, () => dispatch(AnnoActions.moveCodeToTop(codeId)));
    }
  };

  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    if (draft) {
      if (reason === "backdropClick") {
        startCreate(draft.annotation, draft.annotation.code_id, () =>
          dispatch(AnnoActions.moveCodeToTop(draft.annotation.code_id)),
        );
      }
    }
    setDraft(undefined);
  };

  const showBulkActions = (isAnnotationAllowedLeft || isAnnotationAllowedRight) && effectiveRightUserId !== undefined;

  if (!codeMap.data) return null;

  return (
    <>
      <AnnotationMenu
        ref={leftSpanMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
        onDuplicate={handleCodeSelectorDuplicateAnnotation}
      />
      <AnnotationMenu
        ref={rightSpanMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
        onDuplicate={handleCodeSelectorDuplicateAnnotation}
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
                  <Tooltip title="Copy all annotations from the other user to mine" placement="top">
                    <span>
                      <Button size="small" onClick={handleApplyAll} loading={createBulkMutation.isPending}>
                        Apply
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Remove all copied annotations from mine" placement="top">
                    <span>
                      <Button size="small" onClick={handleRevertAll} loading={deleteBulkMutation.isPending}>
                        Revert
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Typography variant="button" color="primary">
                  |
                </Typography>
                {isAnnotationAllowedLeft ? (
                  <Tooltip title="Remove all copied annotations from mine" placement="top">
                    <span>
                      <Button size="small" onClick={handleRevertAll} loading={deleteBulkMutation.isPending}>
                        Revert
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Copy all annotations from the other user to mine" placement="top">
                    <span>
                      <Button size="small" onClick={handleApplyAll} loading={createBulkMutation.isPending}>
                        Apply
                      </Button>
                    </span>
                  </Tooltip>
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
                    isAnnotationAllowedRight={isAnnotationAllowedRight}
                    handleApplyAnnotation={handleApplyAnnotation}
                    handleRevertAnnotation={handleRevertAnnotation}
                    setHoveredControlKey={setHoveredControlKey}
                    handleLeftMouseUp={handleLeftMouseUp}
                    handleRightMouseUp={handleRightMouseUp}
                    handleLeftResizeStart={leftResizeController.handleResizeStart}
                    handleRightResizeStart={rightResizeController.handleResizeStart}
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
