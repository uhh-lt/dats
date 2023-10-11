import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import AdocHooks from "../../../api/AdocHooks";
import CodeHooks from "../../../api/CodeHooks";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { useAuth } from "../../../auth/AuthProvider";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import { openSpanAnnotationEditDialog } from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
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
} from "../whiteboardUtils";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { DWTSNodeData, SpanAnnotationNodeData, isCodeNode, isMemoNode, isSdocNode } from "../types";
import BaseCardNode from "./BaseCardNode";
import { AttachedObjectType } from "../../../api/openapi";
import MemoAPI from "../../../features/Memo/MemoAPI";

function SpanAnnotationNode({ id, data, isConnectable, selected, xPos, yPos }: NodeProps<SpanAnnotationNodeData>) {
  // global client state
  const userId = useAuth().user.data!.id;

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global server state (react-query)
  const annotation = SpanAnnotationHooks.useGetAnnotation(data.spanAnnotationId);
  const code = CodeHooks.useGetCode(annotation.data?.code.id);
  const adoc = AdocHooks.useGetAdoc(annotation.data?.annotation_document_id);
  const memo = SpanAnnotationHooks.useGetMemo(data.spanAnnotationId, userId);

  // effects
  useEffect(() => {
    if (!code.data) return;
    const codeId = code.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== codeId); // isEdgeForIncorrectCode
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      reactFlowInstance.addEdges([createCodeSpanAnnotationEdge({ codeId, spanAnnotationId: data.spanAnnotationId })]);
    }
  }, [data.spanAnnotationId, reactFlowInstance, code.data]);

  useEffect(() => {
    if (!adoc.data) return;
    const sdocId = adoc.data.source_document_id;

    // check which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isSdocSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== sdocId); // isEdgeForIncorrectSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      reactFlowInstance.addEdges([createSdocSpanAnnotationEdge({ sdocId, spanAnnotationId: data.spanAnnotationId })]);
    }
  }, [data.spanAnnotationId, reactFlowInstance, adoc.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSpanAnnotationEdge)
      .filter((edge) => edge.target === `spanAnnotation-${data.spanAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoSpanAnnotationEdge({ memoId, spanAnnotationId: data.spanAnnotationId })]);
    }
  }, [data.spanAnnotationId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      openSpanAnnotationEditDialog(annotation.data);
    }
  };

  // context menu actions
  const handleContextMenuExpandDocument = () => {
    if (!adoc.data) return;

    reactFlowService.addNodes(
      createSdocNodes({ sdocs: [adoc.data.source_document_id], position: { x: xPos, y: yPos - 200 } })
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandCode = () => {
    if (!code.data) return;

    reactFlowService.addNodes(createCodeNodes({ codes: [code.data], position: { x: xPos, y: yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memo.data) return;

    reactFlowService.addNodes(createMemoNodes({ memos: [memo.data], position: { x: xPos, y: yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: data.spanAnnotationId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: xPos, y: yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        allowDrawConnection={false}
        nodeId={id}
        selected={selected}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuRef.current?.open({
            top: e.clientY,
            left: e.clientX,
          });
        }}
      >
        {annotation.isSuccess ? (
          <>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center">
                  <CodeRenderer code={annotation.data.code} />
                  <Box sx={{ ml: 1 }}>Annotation</Box>
                </Stack>
              }
            />
            <CardContent>
              <Typography>{annotation.data.span_text}</Typography>
            </CardContent>
          </>
        ) : annotation.isError ? (
          <>{annotation.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
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

export default SpanAnnotationNode;
