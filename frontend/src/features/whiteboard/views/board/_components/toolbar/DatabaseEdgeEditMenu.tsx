import { CodeHooks } from "@api/hooks/CodeHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { Button, ButtonGroup, Paper, Stack } from "@mui/material";
import { Edge, useReactFlow } from "@xyflow/react";
import { Ref, useImperativeHandle, useState } from "react";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSNode } from "../../_types/DATSNode";
import { isCodeNode, isSdocNode, isTagNode } from "../../_types/typeGuards";
import { isCodeParentCodeEdgeArray, isTagSdocEdgeArray } from "../../_utils/whiteboardUtils";

export interface DatabaseEdgeEditMenuHandle {
  open: (edges: Edge[]) => void;
  close: () => void;
}

interface DatabaseEdgeEditMenuProps {
  ref: Ref<DatabaseEdgeEditMenuHandle>;
}

export const DatabaseEdgeEditMenu = ({ ref }: DatabaseEdgeEditMenuProps) => {
  const reactFlowInstance = useReactFlow<DATSNode, DATSEdge>();

  const [edges, setEdges] = useState<Edge[]>([]);

  // methods
  const openMenu = (edges: Edge[]) => {
    setEdges(edges);
  };

  const closeMenu = () => {
    setEdges([]);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // actions
  const bulkUnlinkTagsMutation = TagHooks.useBulkUnlinkTags();
  const handleDeleteTagSdocEdges = () => {
    if (edges.length === 0) return;

    edges.forEach((edge) => {
      const sourceNode = reactFlowInstance.getNode(edge.source);
      const targetNode = reactFlowInstance.getNode(edge.target);

      if (!sourceNode || !targetNode) return;

      if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
        bulkUnlinkTagsMutation.mutate({
          requestBody: {
            tag_ids: [sourceNode.data.tagId],
            source_document_ids: [targetNode.data.sdocId],
          },
        });
      }
    });

    closeMenu();
  };

  const updateCodeMutation = CodeHooks.useUpdateCode();
  const handleDeleteCodeCodeEdges = () => {
    if (edges.length === 0) return;

    edges.forEach((edge) => {
      const sourceNode = reactFlowInstance.getNode(edge.source);
      const targetNode = reactFlowInstance.getNode(edge.target);

      if (!sourceNode || !targetNode) return;

      if (isCodeNode(targetNode) && isCodeNode(sourceNode)) {
        updateCodeMutation.mutate({
          codeId: sourceNode.data.codeId,
          requestBody: {
            parent_id: null,
          },
        });
      }
    });

    closeMenu();
  };

  return (
    <>
      {edges.length > 0 && (
        <Paper sx={{ p: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            {isCodeParentCodeEdgeArray(edges) ? (
              <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
                <Button onClick={handleDeleteCodeCodeEdges}>Remove connection to parent code</Button>
              </ButtonGroup>
            ) : isTagSdocEdgeArray(edges) ? (
              <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
                <Button onClick={handleDeleteTagSdocEdges}>Remove tag from document</Button>
              </ButtonGroup>
            ) : (
              <>Database Edges: No common actions available</>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
};
