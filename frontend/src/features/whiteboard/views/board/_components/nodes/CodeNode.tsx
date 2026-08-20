import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { MemoHooks } from "@api/hooks/MemoHooks";
import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { CodeRenderer } from "@core/code";
import { useOpenMemoDialog } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CodeNodeData } from "@models/CodeNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { CardContent, CardHeader, Divider, MenuItem, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";
import { useReactFlowService } from "../../_hooks/ReactFlowService";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import { isCodeNode, isMemoNode } from "../../_types/typeGuards";
import {
  createBBoxAnnotationNodes,
  createCodeNodes,
  createCodeParentCodeEdge,
  createMemoCodeEdge,
  createMemoNodes,
  createSpanAnnotationNodes,
  isCodeParentCodeEdge,
  isMemoCodeEdge,
} from "../../_utils/whiteboardUtils";
import { BaseCardNode } from "./BaseCardNode";

export type CodeNode = Node<CodeNodeData, WhiteboardNodeType.CODE>;
export function CodeNode(props: NodeProps<CodeNode>) {
  // global client state
  const openCodeEdit = useOpenDialog("codeEdit");
  const openCodeCreate = useOpenDialog("codeCreate");

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const code = CodeHooks.useGetCode(props.data.codeId);
  const bboxAnnotations = BboxAnnotationHooks.useGetByCodeAndUser(props.data.codeId);
  const spanAnnotations = SpanAnnotationHooks.useGetByCodeAndUser(props.data.codeId);
  const parentCode = CodeHooks.useGetCode(code.data?.parent_id);
  const memos = MemoHooks.useGetObjectMemos(AttachedObjectType.CODE, props.data.codeId);

  // TODO: This is not optimal!
  // we need a new route to get all child codes
  // then we need to invalidate these child codes, on code update
  // also! we need a mechanism in the backend to detect loops in the code tree, and prevent them
  const projectCodes = CodeHooks.useGetAllCodesList();
  const childCodes = useMemo(() => {
    return projectCodes.data?.filter((projectcode) => projectcode.parent_id === props.data.codeId) ?? [];
  }, [props.data.codeId, projectCodes.data]);

  // effects
  useEffect(() => {
    if (!parentCode.data) return;
    const parentCodeId = parentCode.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeParentCodeEdge)
      .filter((edge) => edge.target === `code-${props.data.codeId}`)
      .filter((edge) => edge.source !== `code-${parentCodeId}`);
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);

    if (existingCodeNodeIds.includes(parentCodeId)) {
      const newEdge = createCodeParentCodeEdge({ codeId: props.data.codeId, parentCodeId });
      const edgeExists = reactFlowInstance.getEdges().some((edge) => edge.id === newEdge.id);
      if (!edgeExists) {
        reactFlowInstance.addEdges([newEdge]);
      }
    }
  }, [props.data.codeId, reactFlowInstance, parentCode.data]);

  useEffect(() => {
    const codeId = props.data.codeId;
    const childCodeIds = childCodes.map((code) => code.id);

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeParentCodeEdge)
      .filter((edge) => edge.source === `code-${codeId}`)
      .filter((edge) => !childCodeIds.includes(parseInt(edge.target.split("-")[1])));
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which child code nodes are already in the graph and adds edges to the correct node
    const existingChildCodeNodes = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .filter((code) => childCodeIds.includes(code.data.codeId));

    const currentEdges = reactFlowInstance.getEdges();
    const edgesToAdd = existingChildCodeNodes
      .map((childCode) => createCodeParentCodeEdge({ codeId: childCode.data.codeId, parentCodeId: codeId }))
      .filter((newEdge) => !currentEdges.some((existingEdge) => existingEdge.id === newEdge.id));
    if (edgesToAdd.length > 0) {
      reactFlowInstance.addEdges(edgesToAdd);
    }
  }, [reactFlowInstance, props.data.codeId, childCodes]);

  useEffect(() => {
    if (!memos.data) return;
    const memoIds = memos.data.map((memo) => memo.id);

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoCodeEdge)
      .filter((edge) => edge.target === `code-${props.data.codeId}`) // isEdgeForThisCode
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
      .map((memoId) => createMemoCodeEdge({ memoId, codeId: props.data.codeId }))
      .filter((edge) => !currentEdges.some((current) => current.id === edge.id));
    if (edgesToAdd.length) reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.codeId, reactFlowInstance, memos.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2 && code.isSuccess) {
      openCodeEdit({ code: code.data });
    }
  };

  // context menu actions
  const handleContextMenuExpandImageAnnotations = () => {
    if (!bboxAnnotations.data || bboxAnnotations.data.length === 0) return;

    reactFlowService.addNodes(
      createBBoxAnnotationNodes({
        bboxAnnotations: bboxAnnotations.data,
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandTextAnnotations = () => {
    if (!spanAnnotations.data || spanAnnotations.data.length === 0) return;

    reactFlowService.addNodes(
      createSpanAnnotationNodes({
        spanAnnotations: spanAnnotations.data,
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandChildCodes = () => {
    if (childCodes.length === 0) return;

    reactFlowService.addNodes(
      createCodeNodes({
        codes: childCodes,
        position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateChildCode = () => {
    openCodeCreate(
      {
        codeName: undefined,
        parentCodeId: props.data.codeId,
      },
      (code) => {
        reactFlowService.addNodes(
          createCodeNodes({
            codes: [code],
            position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 },
          }),
        );
      },
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandParentCode = () => {
    if (!parentCode.data) return;

    reactFlowService.addNodes(
      createCodeNodes({
        codes: [parentCode.data],
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
      attachedObjectType: AttachedObjectType.CODE,
      attachedObjectId: props.data.codeId,
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
        nodeProps={props}
        allowDrawConnection={true}
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
        {code.isSuccess ? (
          <>
            <CardHeader title={<CodeRenderer code={code.data} />} />
            <CardContent>
              <Typography>{code.data.description}</Typography>
            </CardContent>
          </>
        ) : code.isError ? (
          <>{code.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandTextAnnotations}>
          Expand text annotations ({spanAnnotations.data?.length || 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuExpandImageAnnotations}>
          Expand image annotations ({bboxAnnotations.data?.length || 0})
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandParentCode} disabled={!parentCode.data}>
          Expand parent code
        </MenuItem>
        <MenuItem onClick={handleContextMenuExpandChildCodes}>Expand child codes</MenuItem>
        <MenuItem onClick={handleContextMenuCreateChildCode} disabled={code.data?.is_system}>
          Create child code
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandMemo} disabled={!memos.data?.length}>
          Expand memos ({memos.data?.length ?? 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuCreateMemo}>Add memo</MenuItem>
      </GenericPositionMenu>
    </>
  );
}
