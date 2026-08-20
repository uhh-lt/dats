import { CodeHooks } from "@api/hooks/CodeHooks";
import { MemoHooks } from "@api/hooks/MemoHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { CodeRenderer } from "@core/code";
import { useOpenMemoDialog } from "@core/memo";
import { useTabNavigate } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SpanAnnotationNodeData } from "@models/SpanAnnotationNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useReactFlowService } from "../../_hooks/ReactFlowService";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import { isCodeNode, isMemoNode, isSdocNode } from "../../_types/typeGuards";
import {
  createCodeNodes,
  createCodeSpanAnnotationEdge,
  createMemoNodes,
  createMemoSpanAnnotationEdge,
  createSdocNodes,
  createSdocSpanAnnotationEdge,
  isCodeSpanAnnotationEdge,
  isMemoSpanAnnotationEdge,
  isSdocSpanAnnotationEdge,
} from "../../_utils/whiteboardUtils";
import { BaseCardNode } from "./BaseCardNode";

export type SpanAnnotationNode = Node<SpanAnnotationNodeData, WhiteboardNodeType.SPAN_ANNOTATION>;
export function SpanAnnotationNode(props: NodeProps<SpanAnnotationNode>) {
  // global client state
  const openSpanAnnotationEdit = useOpenDialog("spanAnnotationEdit");

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const annotation = SpanAnnotationHooks.useGetAnnotation(props.data.spanAnnotationId);
  const code = CodeHooks.useGetCode(annotation.data?.code_id);
  const memos = MemoHooks.useGetObjectMemos(AttachedObjectType.SPAN_ANNOTATION, props.data.spanAnnotationId);

  // effects
  useEffect(() => {
    if (!code.data) return;
    const codeId = code.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${props.data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== codeId); // isEdgeForIncorrectCode
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      const newEdge = createCodeSpanAnnotationEdge({ codeId, spanAnnotationId: props.data.spanAnnotationId });
      const edgeExists = reactFlowInstance.getEdges().some((edge) => edge.id === newEdge.id);
      if (!edgeExists) {
        reactFlowInstance.addEdges([newEdge]);
      }
    }
  }, [props.data.spanAnnotationId, reactFlowInstance, code.data]);

  useEffect(() => {
    if (!annotation.data) return;
    const sdocId = annotation.data.sdoc_id;

    // check which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isSdocSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${props.data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== sdocId); // isEdgeForIncorrectSdoc
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      const newEdge = createSdocSpanAnnotationEdge({ sdocId, spanAnnotationId: props.data.spanAnnotationId });
      const edgeExists = reactFlowInstance.getEdges().some((edge) => edge.id === newEdge.id);
      if (!edgeExists) {
        reactFlowInstance.addEdges([newEdge]);
      }
    }
  }, [props.data.spanAnnotationId, reactFlowInstance, annotation.data]);

  useEffect(() => {
    if (!memos.data) return;
    const memoIds = memos.data.map((memo) => memo.id);

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${props.data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => !memoIds.includes(parseInt(edge.source.split("-")[1]))); // isEdgeForIncorrectMemo
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    const currentEdges = reactFlowInstance.getEdges();
    const edgesToAdd = existingMemoNodeIds
      .filter((memoId) => memoIds.includes(memoId))
      .map((memoId) => createMemoSpanAnnotationEdge({ memoId, spanAnnotationId: props.data.spanAnnotationId }))
      .filter((edge) => !currentEdges.some((current) => current.id === edge.id));
    if (edgesToAdd.length) reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.spanAnnotationId, reactFlowInstance, memos.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      openSpanAnnotationEdit({ annotationIds: [annotation.data.id] });
    }
  };

  // context menu actions
  const tabNavigate = useTabNavigate();
  const handleContextMenuGoToDocument = () => {
    if (!annotation.data || !code.data) return;

    tabNavigate({
      to: "/project/$projectId/annotation/$sdocId",
      params: { sdocId: annotation.data.sdoc_id, projectId: code.data.project_id },
      search: {
        visibleUserId: annotation.data.user_id,
        selectedAnnotationId: annotation.data.id,
        compareWithUserId: undefined,
      },
    });

    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandDocument = () => {
    if (!annotation.data) return;

    reactFlowService.addNodes(
      createSdocNodes({
        sdocs: [annotation.data.sdoc_id],
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandCode = () => {
    if (!code.data) return;

    reactFlowService.addNodes(
      createCodeNodes({
        codes: [code.data],
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memos.data?.length) return;

    reactFlowService.addNodes(
      createMemoNodes({
        memos: memos.data,
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const openMemoDialog = useOpenMemoDialog();
  const handleContextMenuCreateMemo = () => {
    openMemoDialog({
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: props.data.spanAnnotationId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(
          createMemoNodes({
            memos: [memo],
            position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
          }),
        );
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        allowDrawConnection={false}
        nodeProps={props}
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
        {annotation.isSuccess ? (
          <>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center">
                  <CodeRenderer code={annotation.data.code_id} />
                  <Box sx={{ ml: 1 }}>Annotation</Box>
                </Stack>
              }
            />
            <CardContent>
              <Typography>{annotation.data.text}</Typography>
            </CardContent>
          </>
        ) : annotation.isError ? (
          <>{annotation.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuGoToDocument}>Go to document</MenuItem>
        <MenuItem onClick={handleContextMenuExpandDocument}>Expand document</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandCode}>Expand code</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandMemo} disabled={!memos.data?.length}>
          Expand memos ({memos.data?.length ?? 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuCreateMemo}>Add memo</MenuItem>
      </GenericPositionMenu>
    </>
  );
}
