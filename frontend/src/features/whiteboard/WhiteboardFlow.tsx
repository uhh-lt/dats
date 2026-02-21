import InterestsIcon from "@mui/icons-material/Interests";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, IconButton, Menu, MenuItem, Paper, Stack, Tooltip } from "@mui/material";
import { useBlocker } from "@tanstack/react-router";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  DefaultEdgeOptions,
  Edge,
  IsValidConnection,
  MarkerType,
  MiniMap,
  Node,
  NodeMouseHandler,
  NodeTypes,
  OnConnect,
  OnSelectionChangeFunc,
  Panel,
  ReactFlow,
  ReactFlowState,
  updateEdge,
  useReactFlow,
  useStore,
  XYPosition,
} from "reactflow";
import "reactflow/dist/style.css";
import { BboxAnnotationHooks } from "../../api/BboxAnnotationHooks.ts";
import { CodeHooks } from "../../api/CodeHooks.ts";
import { WhiteboardContent_Output } from "../../api/openapi/models/WhiteboardContent_Output.ts";
import { WhiteboardEdgeData_Output } from "../../api/openapi/models/WhiteboardEdgeData_Output.ts";
import { WhiteboardNodeType } from "../../api/openapi/models/WhiteboardNodeType.ts";
import { WhiteboardRead } from "../../api/openapi/models/WhiteboardRead.ts";
import { SentenceAnnotationHooks } from "../../api/SentenceAnnotationHooks.ts";
import { SpanAnnotationHooks } from "../../api/SpanAnnotationHooks.ts";
import { TagHooks } from "../../api/TagHooks.ts";
import { WhiteboardHooks } from "../../api/WhiteboardHooks.ts";
import { EditableTypography } from "../../components/EditableTypography.tsx";
import { BBoxAnnotationEditDialog } from "../../core/bbox-annotation/dialog/BBoxAnnotationEditDialog.tsx";
import { SentenceAnnotationEditDialog } from "../../core/sentence-annotation/dialog/SentenceAnnotationEditDialog.tsx";
import { SpanAnnotationEditDialog } from "../../core/span-annotation/dialog/SpanAnnotationEditDialog.tsx";
import { downloadFile } from "../../utils/ExportUtils.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { StraightConnectionLine } from "./connectionlines/StraightConnectionLine.tsx";
import { CustomEdge } from "./edges/CustomEdge.tsx";
import { FloatingEdge } from "./edges/FloatingEdge.tsx";
import { useReactFlowService } from "./hooks/ReactFlowService.ts";
import { useEdgeStateCustom, useNodeStateCustom } from "./hooks/useNodesEdgesStateCustom.ts";
import { BboxAnnotationNode } from "./nodes/BboxAnnotationNode.tsx";
import { BorderNode } from "./nodes/BorderNode.tsx";
import { CodeNode } from "./nodes/CodeNode.tsx";
import { MemoNode } from "./nodes/MemoNode.tsx";
import { NoteNode } from "./nodes/NoteNode.tsx";
import { SdocNode } from "./nodes/SdocNode.tsx";
import { SentenceAnnotationNode } from "./nodes/SentenceAnnotationNode.tsx";
import { SpanAnnotationNode } from "./nodes/SpanAnnotationNode.tsx";
import { TagNode } from "./nodes/TagNode.tsx";
import { TextNode } from "./nodes/TextNode.tsx";
import { AddBBoxAnnotationNodeDialog } from "./toolbar/AddBBoxAnnotationNodeDialog.tsx";
import { AddBorderNodeButton } from "./toolbar/AddBorderNodeButton.tsx";
import { AddCodeNodeDialog } from "./toolbar/AddCodeNodeDialog.tsx";
import { AddDocumentNodeDialog } from "./toolbar/AddDocumentNodeDialog.tsx";
import { AddMemoNodeDialog } from "./toolbar/AddMemoNodeDialog.tsx";
import { AddNoteNodeButton } from "./toolbar/AddNoteNodeButton.tsx";
import { AddSentenceAnnotationNodeDialog } from "./toolbar/AddSentenceAnnotationNodeDialog.tsx";
import { AddSpanAnnotationNodeDialog } from "./toolbar/AddSpanAnnotationNodeDialog.tsx";
import { AddTagNodeDialog } from "./toolbar/AddTagNodeDialog.tsx";
import { AddTextNodeButton } from "./toolbar/AddTextNodeButton.tsx";
import { DatabaseEdgeEditMenu, DatabaseEdgeEditMenuHandle } from "./toolbar/DatabaseEdgeEditMenu.tsx";
import { EdgeEditMenu, EdgeEditMenuHandle } from "./toolbar/EdgeEditMenu.tsx";
import { NodeEditMenu, NodeEditMenuHandle } from "./toolbar/NodeEditMenu.tsx";
import { DATSNodeData } from "./types/DATSNodeData.ts";
import { PendingAddNodeAction } from "./types/PendingAddNodeAction.ts";
import {
  isBBoxAnnotationNode,
  isCodeNode,
  isCustomNode,
  isSdocNode,
  isSentenceAnnotationNode,
  isSpanAnnotationNode,
  isTagNode,
} from "./types/typeGuards.ts";
import "./whiteboard.css";
import {
  defaultDatabaseEdgeOptions,
  duplicateCustomNodes,
  isCustomEdge,
  isCustomEdgeArray,
  isDatabaseEdge,
} from "./whiteboardUtils.ts";

const nodeTypes: NodeTypes = {
  [WhiteboardNodeType.BORDER]: BorderNode,
  [WhiteboardNodeType.NOTE]: NoteNode,
  [WhiteboardNodeType.TEXT]: TextNode,
  [WhiteboardNodeType.MEMO]: MemoNode,
  [WhiteboardNodeType.SDOC]: SdocNode,
  [WhiteboardNodeType.TAG]: TagNode,
  [WhiteboardNodeType.CODE]: CodeNode,
  [WhiteboardNodeType.SPAN_ANNOTATION]: SpanAnnotationNode,
  [WhiteboardNodeType.SENTENCE_ANNOTATION]: SentenceAnnotationNode,
  [WhiteboardNodeType.BBOX_ANNOTATION]: BboxAnnotationNode,
};

const edgeTypes = {
  floating: FloatingEdge,
  custom: CustomEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "custom",
  data: {
    label: {
      text: "",
      variant: "body1",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 255,
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontFamily: "Arial",
      fontSize: 12,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
    type: "simplebezier",
  } as WhiteboardEdgeData_Output,
  style: {
    stroke: "#000000",
    strokeWidth: 3,
  },
  markerEnd: {
    color: "#000000",
    type: MarkerType.ArrowClosed,
  },
  markerStart: "",
};

const isValidConnection: IsValidConnection = (connection) => {
  // do not allow connection to self
  if (connection.source === connection.target) return false;

  // if source or target handle are database, the other source or target handle has to be database as well
  if (connection.sourceHandle === "database" || connection.targetHandle === "database") {
    return connection.sourceHandle === "database" && connection.targetHandle === "database";
  }
  return true;
};

const resetSelectedElementsSelector = (state: ReactFlowState) => state.resetSelectedElements;
const connectionHandleIdSelector = (state: ReactFlowState) => state.connectionHandleId;

interface WhiteboardFlowProps {
  whiteboard: WhiteboardRead;
}

export function WhiteboardFlow({ whiteboard }: WhiteboardFlowProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);
  const resetSelection = useStore(resetSelectedElementsSelector);
  const connectionHandleId = useStore(connectionHandleIdSelector);

  // mutations
  const bulkLinkTagsMutation = TagHooks.useBulkLinkTags();
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const updateSpanAnnotationMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const updateSentenceAnnotationMutation = SentenceAnnotationHooks.useUpdateSentenceAnnotation();
  const updateBBoxAnnotationMutation = BboxAnnotationHooks.useUpdateBBoxAnnotation();

  // refs
  const flowRef = useRef<HTMLDivElement>(null);
  const nodeEditMenuRef = useRef<NodeEditMenuHandle>(null);
  const edgeEditMenuRef = useRef<EdgeEditMenuHandle>(null);
  const databaseEdgeEditMenuRef = useRef<DatabaseEdgeEditMenuHandle>(null);

  // local state
  const [pendingAction, setPendingAction] = useState<PendingAddNodeAction | undefined>(undefined);
  const [nodes, , onNodesChange] = useNodeStateCustom<DATSNodeData>(whiteboard.content.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgeStateCustom(whiteboard.content.edges as Edge[]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [shapeMenuAnchor, setShapeMenuAnchor] = useState<null | HTMLElement>(null);
  const shapeMenuOpen = Boolean(shapeMenuAnchor);

  const handleChangePendingAction = useCallback(
    (action: PendingAddNodeAction | undefined) => {
      resetSelection();
      setPendingAction(() => action);
    },
    [resetSelection],
  );

  const handleExecutePendingAction = (event: React.MouseEvent<Element, MouseEvent>) => {
    if (!pendingAction) return;

    // 64 is toolbar sizse
    const whiteboardPosition: XYPosition = reactFlowInstance.project({ x: event.clientX, y: event.clientY - 64 });
    pendingAction(whiteboardPosition, reactFlowService);
    setPendingAction(undefined);
  };

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setPendingAction(undefined);
      if (!connection.source || !connection.target) return;

      if (connection.sourceHandle === "database" && connection.targetHandle === "database") {
        const sourceNode = reactFlowInstance.getNode(connection.source);
        const targetNode = reactFlowInstance.getNode(connection.target);

        if (!sourceNode || !targetNode) return;

        // tag can be manually connected to document
        if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
          const mutation = bulkLinkTagsMutation.mutate;
          mutation({
            requestBody: {
              tag_ids: [sourceNode.data.tagId],
              source_document_ids: [targetNode.data.sdocId],
            },
          });
        }

        // code can be manually connected to other code
        if (isCodeNode(sourceNode) && isCodeNode(targetNode)) {
          const mutation = updateCodeMutation.mutate;
          mutation({
            codeId: sourceNode.data.codeId,
            requestBody: {
              parent_id: targetNode.data.codeId,
            },
          });
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isSpanAnnotationNode(targetNode)) {
          const mutation = updateSpanAnnotationMutation.mutate;
          mutation({
            spanAnnotationToUpdate: targetNode.data.spanAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          });
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isSentenceAnnotationNode(targetNode)) {
          const mutation = updateSentenceAnnotationMutation.mutate;
          mutation({
            sentenceAnnoToUpdate: targetNode.data.sentenceAnnotationId,
            update: {
              code_id: sourceNode.data.codeId,
            },
          });
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isBBoxAnnotationNode(targetNode)) {
          const mutation = updateBBoxAnnotationMutation.mutate;
          mutation({
            bboxToUpdate: targetNode.data.bboxAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          });
        }
      } else {
        setEdges((e) => addEdge(connection, e));
      }
    },
    [
      reactFlowInstance,
      bulkLinkTagsMutation.mutate,
      updateCodeMutation.mutate,
      updateSpanAnnotationMutation.mutate,
      updateBBoxAnnotationMutation.mutate,
      updateSentenceAnnotationMutation.mutate,
      setEdges,
    ],
  );

  // gets called after end of edge gets dragged to another source or target
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = () => {
    setPendingAction(undefined);
  };

  const onEdgeClick = () => {
    setPendingAction(undefined);
  };

  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes, edges }) => {
    setSelectedEdges(edges);
    setSelectedNodes(nodes);

    if (edges.length >= 1) {
      // only open database edge edit menu if all edges are database edges
      databaseEdgeEditMenuRef.current?.open(edges.filter((edge) => isDatabaseEdge(edge)));
      edgeEditMenuRef.current?.open(edges.filter((edge) => isCustomEdge(edge)));
    } else {
      edgeEditMenuRef.current?.close();
      databaseEdgeEditMenuRef.current?.close();
    }

    if (nodes.length >= 1) {
      nodeEditMenuRef.current?.open(nodes);
    } else {
      nodeEditMenuRef.current?.close();
    }
  };

  // HIGHLIGHT Feature
  // highlight handles of selected edges
  useEffect(() => {
    const elements = document.getElementsByClassName("selected-handle");
    Array.from(elements).forEach((element: Element) => {
      (element as HTMLElement).classList.remove("selected-handle");
    });

    selectedEdges.forEach((currentEdge) => {
      const sourceHandle = document.querySelector(
        `[data-id='${currentEdge.source}-${currentEdge.sourceHandle}-source']`,
      );
      const targetHandle = document.querySelector(
        `[data-id='${currentEdge.target}-${currentEdge.targetHandle}-source']`,
      );
      sourceHandle?.classList.add("selected-handle");
      targetHandle?.classList.add("selected-handle");
    });
  }, [selectedEdges]);

  // SAVE Feature
  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();
  const handleSaveWhiteboard = useCallback(() => {
    const mutation = updateWhiteboard.mutate;
    mutation({
      whiteboardId: whiteboard.id,
      requestBody: {
        title: whiteboard.title,
        content: { nodes: nodes, edges: edges },
      },
    });
  }, [edges, nodes, updateWhiteboard.mutate, whiteboard.id, whiteboard.title]);

  // autosave whiteboard every 3 minutes
  const lastSaveTime = useRef<number>(Date.now());
  if (Date.now() - lastSaveTime.current > 1000 * 60 * 3) {
    lastSaveTime.current = Date.now();
    handleSaveWhiteboard();
  }

  // autosave whiteboard on page unload
  const [oldData, setOldData] = useState(JSON.stringify(whiteboard.content));
  useEffect(() => {
    setOldData(JSON.stringify(whiteboard.content));
  }, [whiteboard.content]);
  useBlocker({
    shouldBlockFn: () => {
      const newData: WhiteboardContent_Output = { nodes: nodes, edges: edges };
      if (oldData !== JSON.stringify(newData)) {
        handleSaveWhiteboard();
      }
      return false;
    },
  });

  // CHANGE TITLE Feature
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      const mutation = updateWhiteboard.mutate;
      mutation({
        whiteboardId: whiteboard.id,
        requestBody: {
          title: newTitle,
        },
      });
    },
    [updateWhiteboard.mutate, whiteboard.id],
  );

  const handleShapeMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setShapeMenuAnchor(event.currentTarget);
  };

  const handleShapeMenuClose = () => {
    setShapeMenuAnchor(null);
  };

  const handleExportWhiteboard = useCallback(() => {
    if (flowRef.current === null) return;
    reactFlowInstance.fitView({
      duration: 0,
      padding: 0.01,
    });
    toPng(flowRef.current, {
      filter: (node) =>
        !(
          node?.classList?.contains("react-flow__minimap") ||
          node?.classList?.contains("react-flow__controls") ||
          node?.classList?.contains("react-flow__panel")
        ),
    }).then((dataUrl) => {
      downloadFile(dataUrl, `whiteboard-${whiteboard.title}.png`);
    });
  }, [reactFlowInstance, whiteboard.title]);

  return (
    <>
      <Box className="myFlexContainer h100">
        <Box className="myFlexFillAllContainer custom-table">
          <ReactFlow
            ref={flowRef}
            className="whiteboardflow"
            nodes={nodes}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            edges={edges}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onEdgesChange={onEdgesChange}
            onEdgeClick={onEdgeClick}
            onEdgeContextMenu={onEdgeClick}
            onEdgeUpdate={onEdgeUpdate}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            connectionLineComponent={connectionHandleId === "database" ? StraightConnectionLine : undefined}
            connectionLineStyle={
              connectionHandleId === "database"
                ? defaultDatabaseEdgeOptions.style
                : {
                    strokeWidth: 3,
                    stroke: "black",
                  }
            }
            style={{
              cursor: pendingAction ? "crosshair" : "grab",
            }}
            onPaneClick={handleExecutePendingAction}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={isValidConnection}
            // do not allow edge delete with backspace for database edges
            deleteKeyCode={isCustomEdgeArray(selectedEdges) ? undefined : ""}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            // readonly:
            // onEdgeUpdate={readonly ? undefined : onEdgeUpdate}
            // elementsSelectable={!readonly}
            // nodesDraggable={!readonly}
            // nodesConnectable={!readonly} // we misuse this as readonly flag for database nodes
            // nodesFocusable={!readonly}
            // edgesFocusable={!readonly}
            onKeyDown={(event) => {
              // copy
              if (event.key === "c" && (event.metaKey || event.ctrlKey)) {
                const action: PendingAddNodeAction = (position, reactFlowService) => {
                  reactFlowService.addNodesWithoutDelay(
                    duplicateCustomNodes(position, selectedNodes.filter(isCustomNode)),
                  );
                };
                setPendingAction(() => action);
              }
              // cancel
              if (event.key === "Escape") {
                setPendingAction(undefined);
              }
            }}
          >
            <Panel position="top-left">
              <Paper elevation={1} sx={{ width: "fit-content" }}>
                <Stack spacing={1} sx={{ p: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <EditableTypography
                      value={whiteboard.title}
                      onChange={handleTitleChange}
                      whiteColor={false}
                      variant="h5"
                    />
                    <Tooltip title="Save whiteboard" placement="bottom" arrow>
                      <IconButton size="small" loading={updateWhiteboard.isPending} onClick={handleSaveWhiteboard}>
                        <SaveIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export whiteboard" placement="bottom" arrow>
                      <IconButton onClick={handleExportWhiteboard} size="small" sx={{ ml: 1 }}>
                        {getIconComponent(Icon.EXPORT)}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-left" style={{ top: "64px" }}>
              <Paper elevation={1} sx={{ width: "fit-content" }}>
                <Stack>
                  <AddDocumentNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddTagNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddCodeNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddSpanAnnotationNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddSentenceAnnotationNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddBBoxAnnotationNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddMemoNodeDialog
                    projectId={whiteboard.project_id}
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-left" style={{ top: "360px" }}>
              <Paper elevation={1} sx={{ width: "fit-content" }}>
                <Stack>
                  <AddNoteNodeButton
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <AddTextNodeButton
                    onClick={handleChangePendingAction}
                    buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                  />
                  <Tooltip title="Add shape" placement="right" arrow>
                    <Button onClick={handleShapeMenuClick} sx={{ minWidth: 0, p: 1, color: "black" }} variant="text">
                      <InterestsIcon />
                    </Button>
                  </Tooltip>
                  <Menu
                    id="shape-menu"
                    anchorEl={shapeMenuAnchor}
                    open={shapeMenuOpen}
                    onClose={handleShapeMenuClose}
                    anchorOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "left",
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          minWidth: "auto",
                          width: "fit-content",
                          marginLeft: 0.8,
                          elevation: 1,
                          boxShadow: 1,
                        },
                      },
                      list: {
                        sx: { p: 0 },
                      },
                    }}
                  >
                    <MenuItem onClick={handleShapeMenuClose} sx={{ p: 0, px: 0, py: 0, minHeight: "auto" }}>
                      <AddBorderNodeButton
                        type="Rectangle"
                        onClick={handleChangePendingAction}
                        buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                      />
                    </MenuItem>
                    <MenuItem onClick={handleShapeMenuClose} sx={{ p: 0, px: 0, py: 0, minHeight: "auto" }}>
                      <AddBorderNodeButton
                        type="Ellipse"
                        onClick={handleChangePendingAction}
                        buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                      />
                    </MenuItem>
                    <MenuItem onClick={handleShapeMenuClose} sx={{ p: 0, px: 0, py: 0, minHeight: "auto" }}>
                      <AddBorderNodeButton
                        type="Rounded"
                        onClick={handleChangePendingAction}
                        buttonProps={{ sx: { minWidth: 0, p: 1, color: "black" }, variant: "text" }}
                      />
                    </MenuItem>
                  </Menu>
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {pendingAction && <Paper sx={{ p: 1 }}>Click anywhere to add node(s)!</Paper>}
              <NodeEditMenu ref={nodeEditMenuRef} />
              <EdgeEditMenu ref={edgeEditMenuRef} />
              <DatabaseEdgeEditMenu ref={databaseEdgeEditMenuRef} />
            </Panel>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>
      </Box>
      <SpanAnnotationEditDialog projectId={whiteboard.project_id} />
      <SentenceAnnotationEditDialog projectId={whiteboard.project_id} />
      <BBoxAnnotationEditDialog projectId={whiteboard.project_id} />
    </>
  );
}
