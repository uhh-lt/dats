import { CardContent, CardHeader, MenuItem, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { Edge, Node, NodeProps, XYPosition, useReactFlow } from "reactflow";
import MemoHooks from "../../../api/MemoHooks";
import {
  AttachedObjectType,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import MemoAPI from "../../../features/Memo/MemoAPI";
import useGetMemosAttachedObject from "../../../features/Memo/useGetMemosAttachedObject";
import { useReactFlowService } from "../hooks/ReactFlowService";
import {
  BBoxAnnotationNodeData,
  CodeNodeData,
  DWTSNodeData,
  MemoNodeData,
  SdocNodeData,
  SpanAnnotationNodeData,
  TagNodeData,
  isBBoxAnnotationNode,
  isCodeNode,
  isSdocNode,
  isSpanAnnotationNode,
  isTagNode,
} from "../types";
import {
  createBBoxAnnotationNodes,
  createCodeNodes,
  createMemoBBoxAnnotationEdge,
  createMemoCodeEdge,
  createMemoSdocEdge,
  createMemoSpanAnnotationEdge,
  createMemoTagEdge,
  createSdocNodes,
  createSpanAnnotationNodes,
  createTagNodes,
  isMemoBBoxAnnotationEdge,
  isMemoCodeEdge,
  isMemoSdocEdge,
  isMemoSpanAnnotationEdge,
  isMemoTagEdge,
} from "../whiteboardUtils";
import BaseNode from "./BaseNode";

const isMemoAttachedObjectEdge = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return isMemoTagEdge;
    case AttachedObjectType.CODE:
      return isMemoCodeEdge;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isMemoSdocEdge;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isMemoSpanAnnotationEdge;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isMemoBBoxAnnotationEdge;
    default:
      return (edge: Edge) => false;
  }
};

const isAttachedObjectNode = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return isTagNode;
    case AttachedObjectType.CODE:
      return isCodeNode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isSdocNode;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isSpanAnnotationNode;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isBBoxAnnotationNode;
    default:
      return (node: Node) => false;
  }
};

const getAttachedObjectNodeId = (attachedObjectType: AttachedObjectType) => (node: Node<DWTSNodeData>) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return (node as Node<TagNodeData>).data.tagId;
    case AttachedObjectType.CODE:
      return (node as Node<CodeNodeData>).data.codeId;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return (node as Node<SdocNodeData>).data.sdocId;
    case AttachedObjectType.SPAN_ANNOTATION:
      return (node as Node<SpanAnnotationNodeData>).data.spanAnnotationId;
    case AttachedObjectType.BBOX_ANNOTATION:
      return (node as Node<BBoxAnnotationNodeData>).data.bboxAnnotationId;
    default:
      return -1;
  }
};

const createMemoAttachedObjectEdge = (
  attachedObjectType: AttachedObjectType,
  attachedObjectId: number,
  memoId: number
): Edge | undefined => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
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
    default:
      return undefined;
  }
};

const createAttachedObjectNodes = (
  attachedObjectType: AttachedObjectType,
  attachedObject:
    | DocumentTagRead
    | CodeRead
    | SpanAnnotationReadResolved
    | BBoxAnnotationReadResolvedCode
    | SourceDocumentRead,
  memoId: number,
  position: XYPosition
): Node<DWTSNodeData>[] => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return createTagNodes({
        tags: [attachedObject as DocumentTagRead],
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
        spanAnnotations: [attachedObject as SpanAnnotationReadResolved],
      });
    case AttachedObjectType.BBOX_ANNOTATION:
      return createBBoxAnnotationNodes({
        bboxAnnotations: [attachedObject as BBoxAnnotationReadResolvedCode],
        position,
      });
    default:
      return [];
  }
};

const attachedObjectType2Label: Record<AttachedObjectType, string> = {
  [AttachedObjectType.DOCUMENT_TAG]: "Tag",
  [AttachedObjectType.CODE]: "Code",
  [AttachedObjectType.SOURCE_DOCUMENT]: "Document",
  [AttachedObjectType.SPAN_ANNOTATION]: "Text Annotation",
  [AttachedObjectType.BBOX_ANNOTATION]: "Image Annotation",
  [AttachedObjectType.PROJECT]: "Project",
  [AttachedObjectType.SPAN_GROUP]: "Span Group",
  [AttachedObjectType.ANNOTATION_DOCUMENT]: "Annotation Document",
};

function MemoNode({ data, isConnectable, selected, xPos, yPos }: NodeProps<MemoNodeData>) {
  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global server state (react-query)
  const memo = MemoHooks.useGetMemo(data.memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  useEffect(() => {
    if (!memo.data || !attachedObject.data) return;
    const attachedObjectId = attachedObject.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoAttachedObjectEdge(memo.data.attached_object_type))
      .filter((edge) => edge.source === `memo-${data.memoId}`) // isEdgeForThisMemo
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== attachedObjectId); // isEdgeForIncorrectAttachedObject
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which attachedObject nodes are already in the graph and adds edge to the correct node
    const existingAttachedObjectNodeIds = reactFlowInstance
      .getNodes()
      .filter(isAttachedObjectNode(memo.data.attached_object_type))
      .map(getAttachedObjectNodeId(memo.data.attached_object_type));

    if (existingAttachedObjectNodeIds.includes(attachedObjectId)) {
      const newEdge = createMemoAttachedObjectEdge(memo.data.attached_object_type, attachedObjectId, data.memoId);
      if (newEdge) {
        reactFlowInstance.addEdges(newEdge);
      }
    }
  }, [data.memoId, reactFlowInstance, memo.data, attachedObject.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!memo.data) return;

    if (event.detail >= 2) {
      MemoAPI.openMemo({
        memoId: memo.data.id,
        attachedObjectType: memo.data.attached_object_type,
        attachedObjectId: memo.data.attached_object_id,
      });
    }
  };

  const handleContextMenuExpandAttachedObject = () => {
    if (!memo.data || !attachedObject.data) return;

    reactFlowService.addNodes(
      createAttachedObjectNodes(memo.data.attached_object_type, attachedObject.data, data.memoId, { x: xPos, y: yPos })
    );
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseNode
        raised={selected}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuRef.current?.open({
            top: e.clientY,
            left: e.clientX,
          });
        }}
      >
        {memo.isSuccess ? (
          <>
            <CardHeader title={"Memo: " + memo.data.title} />
            <CardContent>
              <Typography>{memo.data.content}</Typography>
            </CardContent>
          </>
        ) : memo.isError ? (
          <Typography variant="body2">{memo.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading ...</Typography>
        )}
      </BaseNode>
      <GenericPositionMenu ref={contextMenuRef}>
        {memo.data && (
          <MenuItem onClick={handleContextMenuExpandAttachedObject} disabled={!attachedObject.data}>
            Expand {attachedObjectType2Label[memo.data.attached_object_type]}
          </MenuItem>
        )}
      </GenericPositionMenu>
    </>
  );
}

export default MemoNode;
