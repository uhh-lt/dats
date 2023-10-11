import { CardContent, CardHeader, Divider, MenuItem, Typography } from "@mui/material";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import SdocHooks from "../../../api/SdocHooks";
import TagHooks from "../../../api/TagHooks";
import { useAuth } from "../../../auth/AuthProvider";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import { openTagEditDialog } from "../../../features/CrudDialog/Tag/TagEditDialog";
import {
  createMemoNodes,
  createMemoTagEdge,
  createSdocNodes,
  createTagSdocEdge,
  isMemoTagEdge,
  isTagSdocEdge,
} from "../whiteboardUtils";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { DWTSNodeData, isMemoNode, isSdocNode } from "../types";
import { TagNodeData } from "../types/TagNodeData";
import BaseCardNode from "./BaseCardNode";
import { AttachedObjectType } from "../../../api/openapi";
import MemoAPI from "../../../features/Memo/MemoAPI";

function TagNode({ id, data, isConnectable, selected, xPos, yPos }: NodeProps<TagNodeData>) {
  // global client state
  const userId = useAuth().user.data!.id;

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global server state (react-query)
  const tag = TagHooks.useGetTag(data.tagId);
  const sdocs = SdocHooks.useGetByTagId(data.tagId);
  const memo = TagHooks.useGetMemo(data.tagId, userId);

  // effects
  useEffect(() => {
    if (!sdocs.data) return;
    const sdocIds = sdocs.data.map((sdoc) => sdoc.id);

    // checks which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge)
      .filter((edge) => edge.source === `tag-${data.tagId}`) // isEdgeForThisTag
      .filter((edge) => !sdocIds.includes(parseInt(edge.target.split("-")[1]))); // isEdgeForNonExistingSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    //  checks which sdoc nodes are already in the graph and adds edges to them
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    const edgesToAdd = intersection(existingSdocNodeIds, sdocIds).map((sdocId) =>
      createTagSdocEdge({ tagId: data.tagId, sdocId })
    );
    reactFlowInstance.addEdges(edgesToAdd);
  }, [data.tagId, reactFlowInstance, sdocs.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoTagEdge)
      .filter((edge) => edge.target === `tag-${data.tagId}`) // isEdgeForThisTag
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoTagEdge({ memoId, tagId: data.tagId })]);
    }
  }, [data.tagId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      openTagEditDialog(data.tagId);
    }
  };

  const handleContextMenuExpandDocuments = () => {
    if (!sdocs.data) return;
    reactFlowService.addNodes(createSdocNodes({ sdocs: sdocs.data, position: { x: xPos, y: yPos - 200 } }));
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
      attachedObjectType: AttachedObjectType.DOCUMENT_TAG,
      attachedObjectId: data.tagId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: xPos, y: yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        allowDrawConnection={true}
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
        <MenuItem onClick={handleContextMenuExpandDocuments}>Expand documents ({sdocs.data?.length || 0})</MenuItem>
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

export default TagNode;
