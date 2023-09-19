import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { parseInt } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_useBlocker, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  DefaultEdgeOptions,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeTypes,
  OnConnect,
  OnSelectionChangeFunc,
  Panel,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import ProjectHooks from "../../api/ProjectHooks";
import TagHooks from "../../api/TagHooks";
import WhiteboardHooks, { Whiteboard, WhiteboardGraph } from "../../api/WhiteboardHooks";
import { useAuth } from "../../auth/AuthProvider";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../components/GenericPositionMenu";
import BBoxAnnotationEditDialog from "../../features/CrudDialog/BBoxAnnotation/BBoxAnnotationEditDialog";
import SpanAnnotationEditDialog from "../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import CodeEditDialog from "../../features/CrudDialog/Code/CodeEditDialog";
import TagEditDialog from "../../features/CrudDialog/Tag/TagEditDialog";
import CustomConnectionLine from "./connectionlines/CustomConnectionLine";
import FloatingEdge from "./edges/FloatingEdge";
import { useEdgeStateCustom, useNodeStateCustom } from "./hooks/useNodesEdgesStateCustom";
import BboxAnnotationNode from "./nodes/BboxAnnotationNode";
import CodeNode from "./nodes/CodeNode";
import MemoNode from "./nodes/MemoNode";
import SdocNode from "./nodes/SdocNode";
import SpanAnnotationNode from "./nodes/SpanAnnotationNode";
import TagNode from "./nodes/TagNode";
import TextNode from "./nodes/TextNode";
import AddAnnotationNodeDialog from "./toolbar/AddAnnotationNodeDialog";
import AddCodeNodeDialog from "./toolbar/AddCodeNodeDialog";
import AddDocumentNodeDialog from "./toolbar/AddDocumentNodeDialog";
import AddMemoNodeDialog from "./toolbar/AddMemoNodeDialog";
import AddTagNodeDialog from "./toolbar/AddTagNodeDialog";
import AddTextNodeButton from "./toolbar/AddTextNodeButton";
import TextNodeEditMenu, { TextNodeEditMenuHandle } from "./toolbar/TextNodeEditMenu";
import { isSdocNode, isTagNode, isTextNode } from "./types";
import { DWTSNodeData } from "./types/DWTSNodeData";
import CodeCreateDialog from "../../features/CrudDialog/Code/CodeCreateDialog";

const nodeTypes: NodeTypes = {
  text: TextNode,
  memo: MemoNode,
  sdoc: SdocNode,
  tag: TagNode,
  code: CodeNode,
  spanAnnotation: SpanAnnotationNode,
  bboxAnnotation: BboxAnnotationNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: "black" },
  type: "floating",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "black",
  },
};

const createConnectionIfAllowed = (sourceNode: Node<DWTSNodeData>, targetNode: Node<DWTSNodeData>): Edge | null => {
  if (isTagNode(sourceNode) && isSdocNode(targetNode)) {
    return {
      id: `sdoc-${targetNode.data.sdocId}-tag-${sourceNode.data.tagId}`,
      source: `tag-${sourceNode.data.tagId}`,
      target: `sdoc-${targetNode.data.sdocId}`,
    };
  }
  return null;
};

interface WhiteboardFlowProps {
  whiteboard: Whiteboard;
}

function WhiteboardFlow({ whiteboard }: WhiteboardFlowProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData>();

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const userId = useAuth().user.data?.id;

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);

  // mutations
  const bulkLinkDocumentTagsMutation = TagHooks.useBulkLinkDocumentTags();
  const bulkUnlinkDocumentTagsMutation = TagHooks.useBulkUnlinkDocumentTags();

  // menu refs
  const sdocTagContextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const textNodeEditMenuRef = useRef<TextNodeEditMenuHandle>(null);

  // local state
  const [nodes, setNodes, onNodesChange] = useNodeStateCustom<DWTSNodeData>(whiteboard.content.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgeStateCustom(whiteboard.content.edges);
  const [currentEdge, setCurrentEdge] = useState<Edge | undefined>(undefined);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = reactFlowInstance.getNode(connection.source);
      const targetNode = reactFlowInstance.getNode(connection.target);

      if (!sourceNode || !targetNode) return;

      let newConnection = createConnectionIfAllowed(sourceNode, targetNode);
      if (newConnection !== null) {
        if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
          bulkLinkDocumentTagsMutation.mutate(
            {
              projectId: projectId,
              requestBody: {
                document_tag_ids: [sourceNode.data.tagId],
                source_document_ids: [targetNode.data.sdocId],
              },
            },
            {
              onSuccess(data, variables, context) {
                SnackbarAPI.openSnackbar({
                  text: "Tag added to document",
                  severity: "success",
                });
              },
            }
          );
        }
      } else {
        alert("Connection not allowed :(");
      }

      console.log(sourceNode, targetNode);
    },
    [bulkLinkDocumentTagsMutation, projectId, reactFlowInstance]
  );

  const handleDeleteTagSdocEdge = () => {
    if (!currentEdge) return;

    const sourceNode = reactFlowInstance.getNode(currentEdge.source);
    const targetNode = reactFlowInstance.getNode(currentEdge.target);

    if (!sourceNode || !targetNode) return;

    if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
      bulkUnlinkDocumentTagsMutation.mutate(
        {
          projectId: projectId,
          requestBody: {
            document_tag_ids: [sourceNode.data.tagId],
            source_document_ids: [targetNode.data.sdocId],
          },
        },
        {
          onSuccess(data, variables, context) {
            SnackbarAPI.openSnackbar({
              text: "Tag removed from document",
              severity: "success",
            });
          },
        }
      );
    }

    sdocTagContextMenuRef.current?.close();
    setCurrentEdge(undefined);
  };

  const onEdgeClick = (event: React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
    sdocTagContextMenuRef.current?.open({
      top: event.clientY,
      left: event.clientX,
    });
    setCurrentEdge(edge);
  };

  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes, edges }) => {
    if (nodes.length === 1 && edges.length === 0 && isTextNode(nodes[0])) {
      textNodeEditMenuRef.current?.open(nodes[0].id);
    } else {
      textNodeEditMenuRef.current?.close();
    }
  };

  // SAVE Feature
  // block navigation if we have changes
  const [oldData, setOldData] = useState(JSON.stringify(whiteboard.content));
  useEffect(() => {
    setOldData(JSON.stringify(whiteboard.content));
  }, [whiteboard.content]);
  unstable_useBlocker(() => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    if (oldData !== JSON.stringify(newData)) {
      return !window.confirm("You have unsaved changes! Are you sure you want to leave?");
    }
    return false;
  });

  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();
  const handleSaveWhiteboard = () => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    updateWhiteboard.mutate(
      {
        whiteboardId: whiteboard.id,
        requestBody: {
          title: whiteboard.title,
          content: JSON.stringify(newData),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Saved whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      }
    );
  };

  return (
    <>
      <Box className="myFlexContainer h100">
        <Box className="myFlexFillAllContainer custom-table">
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            edges={edges}
            onEdgesChange={onEdgesChange}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onEdgeClick={onEdgeClick}
            // onPaneClick={clearSelection}
            // onNodeClick={selectNode}
            // onNodeDragStart={selectNode}
            // onConnectStart={handleNodeExpand}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            connectionLineComponent={CustomConnectionLine}
            connectionLineStyle={{
              strokeWidth: 3,
              stroke: "black",
            }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Panel position="top-left">
              <Paper elevation={1} sx={{ mb: 3 }}>
                <Stack>
                  <Typography p={1}>DWTS Objects</Typography>
                  <AddDocumentNodeDialog projectId={projectId} />
                  <AddTagNodeDialog projectId={projectId} />
                  <AddCodeNodeDialog projectId={projectId} />
                  {userId && <AddAnnotationNodeDialog projectId={projectId} userIds={[userId]} />}
                  {userId && <AddMemoNodeDialog projectId={projectId} userId={userId} />}
                </Stack>
              </Paper>
              <Paper elevation={1}>
                <Stack>
                  <Typography p={1}>Text Elements</Typography>
                  <AddTextNodeButton />
                  <Button>Add text</Button>
                  <Button>Add shape</Button>
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-center">
              <TextNodeEditMenu ref={textNodeEditMenuRef} />
            </Panel>
            <Panel position="top-right">
              <Paper elevation={1}>
                <LoadingButton
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  fullWidth
                  type="submit"
                  loading={updateWhiteboard.isLoading}
                  loadingPosition="start"
                  onClick={handleSaveWhiteboard}
                >
                  Save whiteboard
                </LoadingButton>
              </Paper>
            </Panel>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>
      </Box>
      <GenericPositionMenu ref={sdocTagContextMenuRef}>
        <MenuItem onClick={handleDeleteTagSdocEdge}>Delete Tag - Sdoc Edge</MenuItem>
      </GenericPositionMenu>
      <TagEditDialog />
      <SpanAnnotationEditDialog projectId={projectId} />
      <BBoxAnnotationEditDialog projectId={projectId} />
      <CodeCreateDialog />
      {projectCodes.isSuccess && <CodeEditDialog codes={projectCodes.data} />}
    </>
  );
}

export default WhiteboardFlow;
