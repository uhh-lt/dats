import { CardContent, CardHeader, CardMedia, Divider, MenuItem, Typography } from "@mui/material";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import SdocHooks from "../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import MemoDialogAPI from "../../../components/Memo/MemoDialog/MemoDialogAPI.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { SdocNodeData } from "../types/dbnodes/SdocNodeData.ts";
import { isMemoNode, isTagNode } from "../types/typeGuards.ts";
import {
  createMemoNodes,
  createMemoSdocEdge,
  createTagNodes,
  createTagSdocEdge,
  isMemoSdocEdge,
  isTagSdocEdge,
} from "../whiteboardUtils.ts";
import BaseCardNode from "./BaseCardNode.tsx";

function SdocNode(props: NodeProps<SdocNodeData>) {
  // global client state
  const userId = useAuth().user?.id;

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const sdoc = SdocHooks.useGetDocument(props.data.sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(props.data.sdocId);
  const memo = SdocHooks.useGetMemo(props.data.sdocId, userId);

  const docType = sdoc.data?.doctype;

  // effects
  useEffect(() => {
    if (!tags.data) return;
    const tagIds = tags.data.map((tag) => tag.id);

    // checks which edges are already in the graph and removes edges to non-existing tags
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge) // isTagEdge
      .filter((edge) => edge.target === `sdoc-${props.data.sdocId}`) // isEdgeForThisSdoc
      .filter((edge) => !tagIds.includes(parseInt(edge.source.split("-")[1]))); // isEdgeForNonExistingTag
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which tag nodes are already in the graph and adds edges to them
    const existingTagNodeIds = reactFlowInstance
      .getNodes()
      .filter(isTagNode)
      .map((tag) => tag.data.tagId);
    const edgesToAdd = intersection(existingTagNodeIds, tagIds).map((tagId) =>
      createTagSdocEdge({ tagId, sdocId: props.data.sdocId }),
    );
    reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.sdocId, reactFlowInstance, tags.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSdocEdge)
      .filter((edge) => edge.target === `sdoc-${props.data.sdocId}`) // isEdgeForThisSdoc
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoSdocEdge({ memoId, sdocId: props.data.sdocId })]);
    }
  }, [props.data.sdocId, reactFlowInstance, memo.data]);

  const handleContextMenuExpandTags = () => {
    if (!tags.data) return;

    reactFlowService.addNodes(createTagNodes({ tags: tags.data, position: { x: props.xPos, y: props.yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memo.data) return;

    reactFlowService.addNodes(
      createMemoNodes({ memos: [memo.data], position: { x: props.xPos, y: props.yPos - 200 } }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

    MemoDialogAPI.openMemo({
      attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT,
      attachedObjectId: props.data.sdocId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: props.xPos, y: props.yPos - 200 } }));
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
        <CardHeader title={<SdocRenderer sdoc={props.data.sdocId} link renderDoctypeIcon renderFilename />} />
        <CardContent>
          {sdoc.isSuccess ? (
            <>
              {docType === DocType.IMAGE ? (
                <CardMedia component="img" image={sdoc.data.content} alt="Thumbnail" />
              ) : docType === DocType.TEXT ? (
                <TextPreview sdoc={sdoc.data} />
              ) : (
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
        <MenuItem onClick={handleContextMenuExpandTags}>Expand document tags ({tags.data?.length || 0})</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandAnnotations}>Expand annotations</MenuItem>
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

function TextPreview({ sdoc }: { sdoc: SourceDocumentWithDataRead }) {
  return <Typography>{sdoc.content}</Typography>;
}

export default SdocNode;
