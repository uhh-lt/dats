import { MemoHooks } from "@api/hooks/MemoHooks";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { attachedObjectTypeToText, MemoRenderer, useGetMemosAttachedObject, useOpenMemoDialog } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CodeRead } from "@models/CodeRead";
import { MemoNodeData } from "@models/MemoNodeData";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { TagRead } from "@models/TagRead";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { CardContent, CardHeader, MenuItem, Typography } from "@mui/material";
import { Node, NodeProps, useReactFlow, XYPosition } from "@xyflow/react";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { useReactFlowService } from "../../_hooks/ReactFlowService";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import {
  isBBoxAnnotationNode,
  isCodeNode,
  isSdocNode,
  isSentenceAnnotationNode,
  isSpanAnnotationNode,
  isTagNode,
} from "../../_types/typeGuards";
import {
  createBBoxAnnotationNodes,
  createCodeNodes,
  createMemoBBoxAnnotationEdge,
  createMemoCodeEdge,
  createMemoSdocEdge,
  createMemoSentenceAnnotationEdge,
  createMemoSpanAnnotationEdge,
  createMemoTagEdge,
  createSdocNodes,
  createSentenceAnnotationNodes,
  createSpanAnnotationNodes,
  createTagNodes,
  isMemoBBoxAnnotationEdge,
  isMemoCodeEdge,
  isMemoSdocEdge,
  isMemoSentenceAnnotationEdge,
  isMemoSpanAnnotationEdge,
  isMemoTagEdge,
} from "../../_utils/whiteboardUtils";
import { BaseCardNode } from "./BaseCardNode";

const isMemoAttachedObjectEdge = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.TAG:
      return isMemoTagEdge;
    case AttachedObjectType.CODE:
      return isMemoCodeEdge;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isMemoSdocEdge;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isMemoSpanAnnotationEdge;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isMemoBBoxAnnotationEdge;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return isMemoSentenceAnnotationEdge;
    default:
      return () => false;
  }
};

const isAttachedObjectNode = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.TAG:
      return isTagNode;
    case AttachedObjectType.CODE:
      return isCodeNode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isSdocNode;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isSpanAnnotationNode;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isBBoxAnnotationNode;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return isSentenceAnnotationNode;
    default:
      return () => false;
  }
};

const getAttachedObjectNodeId = (attachedObjectType: AttachedObjectType) => (node: DATSNode) => {
  switch (attachedObjectType) {
    case AttachedObjectType.TAG:
      if (isTagNode(node)) return node.data.tagId;
      break;
    case AttachedObjectType.CODE:
      if (isCodeNode(node)) return node.data.codeId;
      break;
    case AttachedObjectType.SOURCE_DOCUMENT:
      if (isSdocNode(node)) return node.data.sdocId;
      break;
    case AttachedObjectType.SPAN_ANNOTATION:
      if (isSpanAnnotationNode(node)) return node.data.spanAnnotationId;
      break;
    case AttachedObjectType.BBOX_ANNOTATION:
      if (isBBoxAnnotationNode(node)) return node.data.bboxAnnotationId;
      break;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      if (isSentenceAnnotationNode(node)) return node.data.sentenceAnnotationId;
      break;
    default:
      return -1;
  }
};

const createMemoAttachedObjectEdge = (
  attachedObjectType: AttachedObjectType,
  attachedObjectId: number,
  memoId: number,
) => {
  switch (attachedObjectType) {
    case AttachedObjectType.TAG:
      return createMemoTagEdge({
        memoId,
        tagId: attachedObjectId,
      });
    case AttachedObjectType.CODE:
      return createMemoCodeEdge({
        memoId,
        codeId: attachedObjectId,
      });
    case AttachedObjectType.SOURCE_DOCUMENT:
      return createMemoSdocEdge({
        memoId,
        sdocId: attachedObjectId,
      });
    case AttachedObjectType.SPAN_ANNOTATION:
      return createMemoSpanAnnotationEdge({
        memoId,
        spanAnnotationId: attachedObjectId,
      });
    case AttachedObjectType.BBOX_ANNOTATION:
      return createMemoBBoxAnnotationEdge({
        memoId,
        bboxAnnotationId: attachedObjectId,
      });
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return createMemoSentenceAnnotationEdge({
        memoId,
        sentenceAnnotationId: attachedObjectId,
      });
    default:
      return undefined;
  }
};

const createAttachedObjectNodes = (
  attachedObjectType: AttachedObjectType,
  attachedObject:
    | TagRead
    | CodeRead
    | SpanAnnotationRead
    | BBoxAnnotationRead
    | SentenceAnnotationRead
    | SourceDocumentRead,
  position: XYPosition,
): DATSNode[] => {
  switch (attachedObjectType) {
    case AttachedObjectType.TAG:
      return createTagNodes({
        tags: [attachedObject as TagRead],
        position,
      });
    case AttachedObjectType.CODE:
      return createCodeNodes({
        codes: [attachedObject as CodeRead],
        position,
      });
    case AttachedObjectType.SOURCE_DOCUMENT:
      return createSdocNodes({
        sdocs: [attachedObject as SourceDocumentRead],
        position,
      });
    case AttachedObjectType.SPAN_ANNOTATION:
      return createSpanAnnotationNodes({
        spanAnnotations: [attachedObject as SpanAnnotationRead],
      });
    case AttachedObjectType.BBOX_ANNOTATION:
      return createBBoxAnnotationNodes({
        bboxAnnotations: [attachedObject as BBoxAnnotationRead],
        position,
      });
    case AttachedObjectType.SENTENCE_ANNOTATION:
      return createSentenceAnnotationNodes({
        sentenceAnnotations: [attachedObject as SentenceAnnotationRead],
        position,
      });
    default:
      return [];
  }
};

export type MemoNode = Node<MemoNodeData, WhiteboardNodeType.MEMO>;
export function MemoNode(props: NodeProps<MemoNode>) {
  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const memo = MemoHooks.useGetMemo(props.data.memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type, memo.data?.attached_object_id);

  useEffect(() => {
    if (!memo.data || !attachedObject.data) return;
    const attachedObjectId = attachedObject.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoAttachedObjectEdge(memo.data.attached_object_type))
      .filter((edge) => edge.source === `memo-${props.data.memoId}`) // isEdgeForThisMemo
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== attachedObjectId); // isEdgeForIncorrectAttachedObject
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which attachedObject nodes are already in the graph and adds edge to the correct node
    const existingAttachedObjectNodeIds = reactFlowInstance
      .getNodes()
      .filter(isAttachedObjectNode(memo.data.attached_object_type))
      .map(getAttachedObjectNodeId(memo.data.attached_object_type));

    if (existingAttachedObjectNodeIds.includes(attachedObjectId)) {
      const newEdge = createMemoAttachedObjectEdge(memo.data.attached_object_type, attachedObjectId, props.data.memoId);
      if (newEdge) {
        reactFlowInstance.addEdges(newEdge);
      }
    }
  }, [props.data.memoId, reactFlowInstance, memo.data, attachedObject.data]);

  const openMemoDialog = useOpenMemoDialog();
  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!memo.data) return;

    if (event.detail >= 2) {
      openMemoDialog({
        memoId: memo.data.id,
        attachedObjectType: memo.data.attached_object_type,
        attachedObjectId: memo.data.attached_object_id,
      });
    }
  };

  const handleContextMenuExpandAttachedObject = () => {
    if (!memo.data || !attachedObject.data) return;

    reactFlowService.addNodes(
      createAttachedObjectNodes(memo.data.attached_object_type, attachedObject.data, {
        x: props.positionAbsoluteX,
        y: props.positionAbsoluteY,
      }),
    );
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        nodeProps={props}
        allowDrawConnection={false}
        onClick={readonly ? undefined : handleClick}
        onContextMenu={
          readonly
            ? undefined
            : (e) => {
                e.preventDefault();
                contextMenuRef.current?.open({
                  top: e.clientY,
                  left: e.clientX,
                });
              }
        }
        backgroundColor={props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0")}
      >
        {memo.isSuccess ? (
          <>
            <CardHeader title={<MemoRenderer memo={memo.data} showIcon showTitle />} />
            <CardContent>
              <Markdown>{memo.data.content}</Markdown>
            </CardContent>
          </>
        ) : memo.isError ? (
          <Typography variant="body2">{memo.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading ...</Typography>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        {memo.data && (
          <MenuItem onClick={handleContextMenuExpandAttachedObject} disabled={!attachedObject.data}>
            Expand {attachedObjectTypeToText[memo.data.attached_object_type]}
          </MenuItem>
        )}
      </GenericPositionMenu>
    </>
  );
}
