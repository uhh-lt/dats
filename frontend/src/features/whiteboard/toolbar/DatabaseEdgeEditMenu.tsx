import { Button, ButtonGroup, Paper, Stack } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { Edge, useReactFlow } from "reactflow";
import { CodeHooks } from "../../../api/CodeHooks.ts";
import { WhiteboardEdgeData_Input } from "../../../api/openapi/models/WhiteboardEdgeData_Input.ts";
import { TagHooks } from "../../../api/TagHooks.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { isCodeNode, isSdocNode, isTagNode } from "../types/typeGuards.ts";
import { isCodeParentCodeEdgeArray, isTagSdocEdgeArray } from "../whiteboardUtils.ts";

export interface DatabaseEdgeEditMenuHandle {
  open: (edges: Edge[]) => void;
  close: () => void;
}

const DatabaseEdgeEditMenu = forwardRef<DatabaseEdgeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<DATSNodeData, WhiteboardEdgeData_Input>();

  const [edges, setEdges] = useState<Edge[]>([]);

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (edges: Edge[]) => {
    setEdges(edges);
  };

  const closeMenu = () => {
    setEdges([]);
  };

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
});
