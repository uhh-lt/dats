import { MemoHooks } from "@api/hooks/MemoHooks";
import { SdocHooks } from "@api/hooks/SdocHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import { useOpenMemoDialog } from "@core/memo";
import { SdocRenderer } from "@core/source-document";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { DocType } from "@models/DocType";
import { SdocNodeData } from "@models/SdocNodeData";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { CardContent, CardHeader, CardMedia, CircularProgress, Divider, MenuItem, Typography } from "@mui/material";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { useReactFlowService } from "../../_hooks/ReactFlowService";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import { isMemoNode, isTagNode } from "../../_types/typeGuards";
import {
  createMemoNodes,
  createMemoSdocEdge,
  createTagNodes,
  createTagSdocEdge,
  isMemoSdocEdge,
  isTagSdocEdge,
} from "../../_utils/whiteboardUtils";
import { BaseCardNode } from "./BaseCardNode";

export type SdocNode = Node<SdocNodeData, WhiteboardNodeType.SDOC>;
export function SdocNode(props: NodeProps<SdocNode>) {
  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const sdoc = SdocHooks.useGetDocument(props.data.sdocId);
  const tagIds = TagHooks.useGetAllTagIdsBySdocId(props.data.sdocId);
  const memos = MemoHooks.useGetObjectMemos(AttachedObjectType.SOURCE_DOCUMENT, props.data.sdocId);

  const docType = sdoc.data?.doctype;

  // effects
  useEffect(() => {
    if (!tagIds.data) return;

    // checks which edges are already in the graph and removes edges to non-existing tags
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge) // isTagEdge
      .filter((edge) => edge.target === `sdoc-${props.data.sdocId}`) // isEdgeForThisSdoc
      .filter((edge) => !tagIds.data.includes(parseInt(edge.source.split("-")[1]))); // isEdgeForNonExistingTag
    if (edgesToDelete.length > 0) {
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    }

    // checks which tag nodes are already in the graph and adds edges to them
    const existingTagNodeIds = reactFlowInstance
      .getNodes()
      .filter(isTagNode)
      .map((tag) => tag.data.tagId);

    const currentEdges = reactFlowInstance.getEdges();
    const edgesToAdd = intersection(existingTagNodeIds, tagIds.data)
      .map((tagId) => createTagSdocEdge({ tagId, sdocId: props.data.sdocId }))
      .filter((newEdge) => !currentEdges.some((existingEdge) => existingEdge.id === newEdge.id));
    if (edgesToAdd.length > 0) {
      reactFlowInstance.addEdges(edgesToAdd);
    }
  }, [props.data.sdocId, reactFlowInstance, tagIds.data]);

  useEffect(() => {
    if (!memos.data) return;
    const memoIds = memos.data.map((memo) => memo.id);

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSdocEdge)
      .filter((edge) => edge.target === `sdoc-${props.data.sdocId}`) // isEdgeForThisSdoc
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
      .map((memoId) => createMemoSdocEdge({ memoId, sdocId: props.data.sdocId }))
      .filter((edge) => !currentEdges.some((current) => current.id === edge.id));
    if (edgesToAdd.length) reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.sdocId, reactFlowInstance, memos.data]);

  const handleContextMenuExpandTags = () => {
    if (!tagIds.data) return;

    reactFlowService.addNodes(
      createTagNodes({ tags: tagIds.data, position: { x: props.positionAbsoluteX, y: props.positionAbsoluteY - 200 } }),
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
      attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT,
      attachedObjectId: props.data.sdocId,
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

  const handleContextMenuExpandAnnotations = () => {
    alert("Not implemented!");
  };

  return (
    <>
      <BaseCardNode
        nodeProps={props}
        allowDrawConnection={false}
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
        <CardHeader title={<SdocRenderer sdoc={props.data.sdocId} link renderDoctypeIcon renderName />} />
        <CardContent>
          {sdoc.isSuccess ? (
            <>
              {docType === DocType.IMAGE ? (
                <SdocNodeImageContent sdoc={sdoc.data} />
              ) : docType === DocType.TEXT ? null : (
                <Typography fontSize={8} textAlign={"center"}>
                  DOC TYPE IS NOT SUPPORTED
                </Typography>
              )}
            </>
          ) : sdoc.isError ? (
            <Typography variant="body2">{sdoc.error.message}</Typography>
          ) : (
            <Typography variant="body2">Loading ...</Typography>
          )}
        </CardContent>
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandTags}>Expand document tags ({tagIds.data?.length || 0})</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandAnnotations}>Expand annotations</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandMemo} disabled={!memos.data?.length}>
          Expand memos ({memos.data?.length ?? 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuCreateMemo}>Add memo</MenuItem>
      </GenericPositionMenu>
    </>
  );
}

function SdocNodeImageContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  const sdocData = SdocHooks.useGetDocumentData(sdoc.id);

  if (!sdocData.isSuccess) {
    return <CircularProgress />;
  }

  return <CardMedia component="img" image={encodeURI("/content/" + sdocData.data?.repo_url)} alt="Thumbnail" />;
}
