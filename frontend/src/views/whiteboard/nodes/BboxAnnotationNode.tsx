import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks";
import CodeHooks from "../../../api/CodeHooks";
import SdocHooks from "../../../api/SdocHooks";
import { useAuth } from "../../../auth/AuthProvider";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import {
  createCodeBBoxAnnotationEdge,
  createCodeNodes,
  createMemoBBoxAnnotationEdge,
  createMemoNodes,
  createSdocBBoxAnnotationEdge,
  createSdocNodes,
  isCodeBBoxAnnotationEdge,
  isMemoBBoxAnnotationEdge,
  isSdocBBoxAnnotationEdge,
} from "../whiteboardUtils";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { BBoxAnnotationNodeData, DWTSNodeData, isCodeNode, isMemoNode, isSdocNode } from "../types";
import BaseNode from "./BaseNode";
import ImageCropper from "./ImageCropper";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import { openBBoxAnnotationEditDialog } from "../../../features/CrudDialog/BBoxAnnotation/BBoxAnnotationEditDialog";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AttachedObjectType } from "../../../api/openapi";

function BboxAnnotationNode({ data, isConnectable, selected, xPos, yPos }: NodeProps<BBoxAnnotationNodeData>) {
  // global client state
  const userId = useAuth().user.data!.id;

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global server state (react-query)
  const annotation = BboxAnnotationHooks.useGetAnnotation(data.bboxAnnotationId);
  const code = CodeHooks.useGetCode(annotation.data?.code.id);
  const sdoc = SdocHooks.useGetDocumentByAdocId(annotation.data?.annotation_document_id);
  const memo = BboxAnnotationHooks.useGetMemo(data.bboxAnnotationId, userId);

  // effects
  useEffect(() => {
    if (!code.data) return;
    const codeId = code.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== codeId); // isEdgeForIncorrectCode
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      reactFlowInstance.addEdges([createCodeBBoxAnnotationEdge({ codeId, bboxAnnotationId: data.bboxAnnotationId })]);
    }
  }, [data.bboxAnnotationId, reactFlowInstance, code.data]);

  useEffect(() => {
    if (!sdoc.data) return;
    const sdocId = sdoc.data.id;

    // check which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isSdocBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== sdocId); // isEdgeForIncorrectSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      reactFlowInstance.addEdges([createSdocBBoxAnnotationEdge({ sdocId, bboxAnnotationId: data.bboxAnnotationId })]);
    }
  }, [data.bboxAnnotationId, reactFlowInstance, sdoc.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoBBoxAnnotationEdge({ memoId, bboxAnnotationId: data.bboxAnnotationId })]);
    }
  }, [data.bboxAnnotationId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      openBBoxAnnotationEditDialog(annotation.data);
    }
  };

  // context menu actions
  const handleContextMenuExpandDocument = () => {
    if (!sdoc.data) return;

    reactFlowService.addNodes(createSdocNodes({ sdocs: [sdoc.data.id], position: { x: xPos, y: yPos + 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandCode = () => {
    if (!code.data) return;

    reactFlowService.addNodes(createCodeNodes({ codes: [code.data], position: { x: xPos, y: yPos + 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memo.data) return;

    reactFlowService.addNodes(createMemoNodes({ memos: [memo.data], position: { x: xPos, y: yPos + 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.BBOX_ANNOTATION,
      attachedObjectId: data.bboxAnnotationId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: xPos, y: yPos + 200 } }));
      },
    });
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
            <CardContent className="bbox-content" style={{ padding: 2, textAlign: "center" }}>
              {annotation.isSuccess && sdoc.isSuccess ? (
                <ImageCropper
                  imageUrl={sdoc.data.content}
                  x={annotation.data.x_min}
                  y={annotation.data.y_min}
                  width={annotation.data.x_max - annotation.data.x_min}
                  targetWidth={annotation.data.x_max - annotation.data.x_min}
                  height={annotation.data.y_max - annotation.data.y_min}
                  targetHeight={annotation.data.y_max - annotation.data.y_min}
                  style={{
                    border: "4px solid " + annotation.data.code.color,
                  }}
                />
              ) : annotation.isError || sdoc.isError ? (
                <Typography variant="body2">Error!</Typography>
              ) : (
                <Typography variant="body2">Loading ...</Typography>
              )}
            </CardContent>
          </>
        ) : annotation.isError ? (
          <>{annotation.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseNode>
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

export default BboxAnnotationNode;
