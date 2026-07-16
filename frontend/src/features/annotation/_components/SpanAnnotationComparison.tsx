import { CodeHooks, CodeMap } from "@api/hooks/CodeHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { FAKE_ANNOTATION_ID, SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { queryClient } from "@api/queryClient";
import { useAuth } from "@core/auth";
import { useOpenConfirmationDialog, useOpenSnackbar } from "@core/notification";
import { UserRenderer } from "@core/user";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, BoxProps, Button, IconButton, Stack, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SYSTEM_USER_ID } from "@utils/GlobalConstants";
import parse, { DOMNode, domToReact, Element, HTMLReactParserOptions } from "html-react-parser";
import { memo, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnotationRouteAPI } from "../_hooks/annotationRouteAPI";
import { useComputeTokenData } from "../_hooks/useComputeTokenData";
import { Annotation } from "../_types/Annotation";
import { IToken } from "../_types/IToken";
import { AnnoActions } from "../store/annoSlice";
import { SdocAudioLink } from "./_components/SdocAudioLink";
import { SdocImage } from "./_components/SdocImage";
import { SdocVideoLink } from "./_components/SdocVideoLink";
import { Token } from "./_components/Token";
import { AnnotationMenu, AnnotationMenuHandle } from "./annotation-menu";

const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};

const BLOCK_TAGS = new Set([
  "sent",
  "p",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "nav",
  "pre",
  "address",
  "fieldset",
  "legend",
  "hr",
]);

const LEAF_BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote", "pre"]);

const BLOCK_TAGS_SELECTOR = Array.from(BLOCK_TAGS).join(",");

const isBlockOrHasBlockDescendant = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (BLOCK_TAGS.has(tagName)) return true;
  return element.querySelector(BLOCK_TAGS_SELECTOR) !== null;
};

function getHTMLWithInlineAncestors(nodes: Node[]): string {
  if (nodes.length === 0) return "";

  const inlineAncestors: HTMLElement[] = [];
  let curr = nodes[0].parentElement;
  while (curr && curr.tagName.toLowerCase() !== "body" && !BLOCK_TAGS.has(curr.tagName.toLowerCase())) {
    inlineAncestors.unshift(curr);
    curr = curr.parentElement;
  }

  const tempDiv = document.createElement("div");
  let parent: HTMLElement = tempDiv;
  for (const ancestor of inlineAncestors) {
    const clone = ancestor.cloneNode(false) as HTMLElement;
    parent.appendChild(clone);
    parent = clone;
  }

  for (const node of nodes) {
    parent.appendChild(node.cloneNode(true));
  }

  return tempDiv.innerHTML;
}

interface RenderBlock {
  id: string;
  html: string;
  sentenceIds: number[];
}

function partitionNode(node: Node): RenderBlock[] {
  const blocks: RenderBlock[] = [];

  const traverse = (currNode: Node) => {
    if (currNode.nodeType === Node.TEXT_NODE) return;

    const element = currNode as HTMLElement;
    const tagName = element.tagName?.toLowerCase();

    if (LEAF_BLOCK_TAGS.has(tagName)) {
      blocks.push(createRenderBlock([element]));
      return;
    }

    const hasBlockDescendants = Array.from(element.childNodes).some(isBlockOrHasBlockDescendant);

    if (!hasBlockDescendants) {
      blocks.push(createRenderBlock([element]));
      return;
    }

    let currentInlineGroup: Node[] = [];
    const flushInlineGroup = () => {
      if (currentInlineGroup.length > 0) {
        const hasText = currentInlineGroup.some((n) => n.textContent?.trim());
        if (hasText) {
          blocks.push(createRenderBlock(currentInlineGroup));
        }
        currentInlineGroup = [];
      }
    };

    element.childNodes.forEach((child) => {
      if (isBlockOrHasBlockDescendant(child)) {
        flushInlineGroup();
        traverse(child);
      } else {
        currentInlineGroup.push(child);
      }
    });

    flushInlineGroup();
  };

  traverse(node);
  return blocks;
}

function createRenderBlock(nodes: Node[]): RenderBlock {
  const sentenceIds: number[] = [];
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName.toLowerCase() === "sent") {
        sentenceIds.push(parseInt(element.getAttribute("id")!));
      }
      element.querySelectorAll("sent").forEach((sent) => {
        sentenceIds.push(parseInt(sent.getAttribute("id")!));
      });
    }
  });

  const html = getHTMLWithInlineAncestors(nodes);

  return {
    id: `block-${sentenceIds.join("-") || Math.random().toString(36).substr(2, 9)}`,
    html,
    sentenceIds: Array.from(new Set(sentenceIds)).sort((a, b) => a - b),
  };
}

interface SpanAnnotationComparisonProps {
  sdocData: SourceDocumentDataRead;
}

interface BlockContentProps {
  html: string;
  tokenData: IToken[] | undefined;
  annotationsPerToken: Map<number, number[]> | undefined;
  annotationMap: Map<number, SpanAnnotationRead> | undefined;
  projectId: number;
}

const BlockContent = memo(({ html, tokenData, annotationsPerToken, annotationMap, projectId }: BlockContentProps) => {
  const options = useMemo<HTMLReactParserOptions>(() => {
    const parserOpts: HTMLReactParserOptions = {
      replace(domNode: DOMNode): React.ReactElement | string | null | boolean | object | void {
        if (domNode instanceof Element && domNode.attribs) {
          if (domNode.name === "a" && domNode.attribs.href) {
            return <>{domToReact(domNode.children as DOMNode[], parserOpts)}</>;
          } else if (domNode.name === "img" && domNode.attribs.src) {
            const filename = domNode.attribs.src;
            return <SdocImage key={`image-link-${filename}`} filename={filename} projectId={projectId} />;
          } else if (domNode.name === "video" && domNode.attribs.src) {
            const filename = domNode.attribs.src;
            return <SdocVideoLink key={`video-link-${filename}`} filename={filename} projectId={projectId} />;
          } else if (domNode.name === "audio" && domNode.attribs.src) {
            const filename = domNode.attribs.src;
            return <SdocAudioLink key={`audio-link-${filename}`} filename={filename} projectId={projectId} />;
          } else if (domNode.name === "sent" && domNode.attribs.id) {
            const sentenceId = parseInt(domNode.attribs.id);
            return (
              <span key={`sentence-${sentenceId}`} className="sentence" data-sentenceid={sentenceId}>
                {domToReact(domNode.children as DOMNode[], parserOpts)}
              </span>
            );
          } else if (domNode.name === "t" && domNode.attribs.id) {
            const tokenId = parseInt(domNode.attribs.id);
            if (!tokenData || !annotationsPerToken || !annotationMap) {
              return (
                <span data-tokenid={tokenId} className="tok">
                  {domToReact(domNode.children as DOMNode[], parserOpts)}
                </span>
              );
            }
            const token = tokenData[tokenId];
            const spanAnnotations = (annotationsPerToken.get(tokenId) || []).map(
              (annotationId) => annotationMap.get(annotationId)!,
            );
            return <Token key={`token-${tokenId}`} token={token} spanAnnotations={spanAnnotations} />;
          }
        }
      },
    };
    return parserOpts;
  }, [tokenData, annotationsPerToken, annotationMap, projectId]);

  const parsed = useMemo(() => {
    return parse(html, options);
  }, [html, options]);

  return <>{parsed}</>;
});

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

const BlockComparisonRow = memo(
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

  // Parse HTML and partition into RenderBlocks
  const { renderBlocks, sentenceTokenIds } = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sdocData.html, "text/html");

    // Extract sentence token IDs
    const sentences = doc.querySelectorAll("sent");
    const sentTokenIds = Array.from(sentences).map((sentNode) => {
      const tokenNodes = sentNode.querySelectorAll("t");
      return Array.from(tokenNodes).map((tNode) => parseInt(tNode.getAttribute("id")!));
    });

    // Partition body into blocks
    const blocks = partitionNode(doc.body);

    return { renderBlocks: blocks, sentenceTokenIds: sentTokenIds };
  }, [sdocData.html]);

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
