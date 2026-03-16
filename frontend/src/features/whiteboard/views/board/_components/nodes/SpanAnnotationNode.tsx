import { CodeHooks } from "@api/hooks/CodeHooks";
import { MemoHooks } from "@api/hooks/MemoHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { AttachedObjectType } from "@api/models/AttachedObjectType";
import { SpanAnnotationNodeData } from "@api/models/SpanAnnotationNodeData";
import { WhiteboardNodeType } from "@api/models/WhiteboardNodeType";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { CodeRenderer } from "@core/code";
import { useOpenMemoDialog } from "@core/memo";
import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useNavigate } from "@tanstack/react-router";
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
  const memo = MemoHooks.useGetUserMemo(AttachedObjectType.SPAN_ANNOTATION, props.data.spanAnnotationId);

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
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      reactFlowInstance.addEdges([
        createCodeSpanAnnotationEdge({ codeId, spanAnnotationId: props.data.spanAnnotationId }),
      ]);
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
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      reactFlowInstance.addEdges([
        createSdocSpanAnnotationEdge({ sdocId, spanAnnotationId: props.data.spanAnnotationId }),
      ]);
    }
  }, [props.data.spanAnnotationId, reactFlowInstance, annotation.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${props.data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([
        createMemoSpanAnnotationEdge({ memoId, spanAnnotationId: props.data.spanAnnotationId }),
      ]);
    }
  }, [props.data.spanAnnotationId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      openSpanAnnotationEdit({ annotationIds: [annotation.data.id] });
    }
  };

  // context menu actions
  const navigate = useNavigate();
  const handleContextMenuGoToDocument = () => {
    if (!annotation.data || !code.data) return;

    navigate({
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
    if (!memo.data) return;

    reactFlowService.addNodes(
      createMemoNodes({
        memos: [memo.data],
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const openMemoDialog = useOpenMemoDialog();
  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

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
        {memo.data ? (
          <MenuItem onClick={handleContextMenuExpandMemo}>Expand memo</MenuItem>
        ) : (
          <MenuItem onClick={handleContextMenuCreateMemo}>Create memo</MenuItem>
        )}
      </GenericPositionMenu>
    </>
  );
}
