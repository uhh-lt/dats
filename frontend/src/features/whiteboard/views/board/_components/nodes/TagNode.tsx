import { MemoHooks } from "@api/hooks/MemoHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { useOpenMemoDialog } from "@core/memo";
import { TagRenderer } from "@core/tag";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { TagNodeData } from "@models/TagNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { CardContent, CardHeader, Divider, MenuItem, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { useReactFlowService } from "../../_hooks/ReactFlowService";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import { isMemoNode, isSdocNode } from "../../_types/typeGuards";
import {
  createMemoNodes,
  createMemoTagEdge,
  createSdocNodes,
  createTagSdocEdge,
  isMemoTagEdge,
  isTagSdocEdge,
} from "../../_utils/whiteboardUtils";
import { BaseCardNode } from "./BaseCardNode";

export type TagNode = Node<TagNodeData, WhiteboardNodeType.TAG>;
export function TagNode(props: NodeProps<TagNode>) {
  // global client state
  const openTagEdit = useOpenDialog("tagEdit");

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const tag = TagHooks.useGetTag(props.data.tagId);
  const sdocIds = SdocHooks.useGetSdocIdsByTagId(props.data.tagId);
  const memos = MemoHooks.useGetObjectMemos(AttachedObjectType.TAG, props.data.tagId);

  // effects
  useEffect(() => {
    if (!sdocIds.data) return;

    // checks which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge)
      .filter((edge) => edge.source === `tag-${props.data.tagId}`) // isEdgeForThisTag
      .filter((edge) => !sdocIds.data.includes(parseInt(edge.target.split("-")[1]))); // isEdgeForNonExistingSdoc
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    //  checks which sdoc nodes are already in the graph and adds edges to them
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);

    const currentEdges = reactFlowInstance.getEdges();
    const edgesToAdd = intersection(existingSdocNodeIds, sdocIds.data)
      .map((sdocId) => createTagSdocEdge({ tagId: props.data.tagId, sdocId }))
      .filter((newEdge) => !currentEdges.some((existingEdge) => existingEdge.id === newEdge.id));
    if (edgesToAdd.length > 0) {
      reactFlowInstance.addEdges(edgesToAdd);
    }
  }, [props.data.tagId, reactFlowInstance, sdocIds.data]);

  useEffect(() => {
    if (!memos.data) return;
    const memoIds = memos.data.map((memo) => memo.id);

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoTagEdge)
      .filter((edge) => edge.target === `tag-${props.data.tagId}`) // isEdgeForThisTag
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
      .map((memoId) => createMemoTagEdge({ memoId, tagId: props.data.tagId }))
      .filter((edge) => !currentEdges.some((current) => current.id === edge.id));
    if (edgesToAdd.length) reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.tagId, reactFlowInstance, memos.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2 && tag.isSuccess) {
      openTagEdit({ tag: tag.data });
    }
  };

  const handleContextMenuExpandDocuments = () => {
    if (!sdocIds.data) return;
    reactFlowService.addNodes(
      createSdocNodes({
        sdocs: sdocIds.data,
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
      attachedObjectType: AttachedObjectType.TAG,
      attachedObjectId: props.data.tagId,
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
        allowDrawConnection={true}
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
        {tag.isSuccess ? (
          <>
            <CardHeader title={<TagRenderer tag={tag.data} />} />
            <CardContent>
              <Typography>{tag.data.description}</Typography>
            </CardContent>
          </>
        ) : tag.isError ? (
          <>{tag.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandDocuments}>Expand documents ({sdocIds.data?.length || 0})</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandMemo} disabled={!memos.data?.length}>
          Expand memos ({memos.data?.length ?? 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuCreateMemo}>Add memo</MenuItem>
      </GenericPositionMenu>
    </>
  );
}
