import { useCallback, useMemo, useState } from "react";
import ReactFlow, { applyNodeChanges, Background, Controls, NodeChange, Position } from "reactflow";
import "reactflow/dist/style.css";
import { AttachedObjectType, MemoRead } from "../../api/openapi";
import MemoNode from "./nodes/MemoNode";
import SdocNode from "./nodes/SdocNode";
import TagNode from "./nodes/TagNode";
import CodeNode from "./nodes/CodeNode";
import SpanAnnotationNode from "./nodes/SpanAnnotationNode";
import BboxAnnotationNode from "./nodes/BboxAnnotationNode";

const getAttachedTypeNodeCode = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return "tag";
    case AttachedObjectType.CODE:
      return "code";
    case AttachedObjectType.SOURCE_DOCUMENT:
      return "sdoc";
    case AttachedObjectType.SPAN_ANNOTATION:
      return "span";
    case AttachedObjectType.BBOX_ANNOTATION:
      return "bbox";
  }
};

interface MemoFlowProps {
  memos: MemoRead[];
}

function MemoFlow({ memos }: MemoFlowProps) {
  // TODO: backend needs to save (x,y) coords in the DB
  // TODO: create a notes "console" that appears from the bottom of the whiteboard on press of ctrl + shift
  // initial nodes are created without additional requests, since we have all necessary memo information already,
  // However, additionally loaded nodes will request their
  const initialNodes: any[] = memos.map((memo, index) => {
    return {
      id: memo.id.toString(),
      data: memo,
      type: "memo",
      position: { x: 220 * (index % 4), y: 120 * Math.floor(index / 4) },
      zIndex: index,
      selected: false,
    };
  });

  const nodeTypes = useMemo(
    () => ({
      memo: MemoNode,
      sdoc: SdocNode,
      tag: TagNode,
      code: CodeNode,
      span: SpanAnnotationNode,
      bbox: BboxAnnotationNode,
    }),
    []
  );

  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>([]);

  const nodesIndexOfId = useCallback(
    (nodeId: string) => {
      let index = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) {
          return i;
        }
      }
      return index;
    },
    [nodes]
  );

  const extendNode = useCallback(
    (srcNode: any, attachedNodeId: string, extNodeType: string | undefined, position: Position) => {
      nodes.push({
        id: attachedNodeId,
        type: extNodeType,
        data: {
          objId: srcNode.data.attached_object_id,
          isSelected: false,
        },
        position: {
          x: srcNode.position.x,
          y: srcNode.position.y + (position === Position.Top ? -120 : srcNode.height + 30),
        },
      });
      setNodes([...nodes]);
      if (position === Position.Bottom) {
        // edge can have a label when setting a string property "label"
        edges.push({
          id: `${srcNode.id}+${attachedNodeId}`,
          source: srcNode.id,
          target: attachedNodeId,
          type: "smoothstep",
        });
      } else {
        edges.push({
          id: `${attachedNodeId}+${srcNode.id}`,
          source: attachedNodeId,
          target: srcNode.id,
          type: "smoothstep",
        });
      }
      setEdges([...edges]);
    },
    [edges, nodes]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      let nodeIdx = nodesIndexOfId(nodeId);
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].source === nodeId || edges[i].target === nodeId) {
          edges.splice(i, 1);
          break;
        }
      }
      setEdges([...edges]);
      nodes.splice(nodeIdx, 1);
      setNodes([...nodes]);
    },
    [edges, nodes, nodesIndexOfId]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

  const handleNodeExpand = useCallback(
    (evt: any, data: any) => {
      let node = undefined;
      for (let i = 0; i < nodes.length; i++) {
        if (data.nodeId === nodes[i].id) {
          node = nodes[i];
          if (node.type !== "memo") {
            removeNode(node.id);
            return;
          }
          break;
        }
      }
      const nodeType = getAttachedTypeNodeCode(node.data.attached_object_type);
      const attachedNodeId = `${nodeType}-${node.data.attached_object_id}`;
      let attachedNodeIdx = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (attachedNodeId === nodes[i].id) {
          attachedNodeIdx = i;
        }
      }
      const isHandleTarget = data.handleType === "target";
      if (attachedNodeIdx >= 0) {
        for (let i = 0; i < edges.length; i++) {
          let edge = edges[i];
          if (edge.source === node.id) {
            // attached node was on bottom
            removeNode(attachedNodeId);
            if (isHandleTarget) {
              // recreate attached node on top
              // handles can not be in a conditional, as stated here:
              //  https://github.com/wbkd/react-flow/issues/2364
              extendNode(node, attachedNodeId, nodeType, Position.Top);
            }
            return;
          } else if (edge.target === node.id) {
            // attached node was on top
            removeNode(attachedNodeId);
            if (!isHandleTarget) {
              extendNode(node, attachedNodeId, nodeType, Position.Bottom);
            }
            return;
          }
        }
      } else {
        // Attached node does not exist yet => expand new node
        extendNode(node, attachedNodeId, nodeType, isHandleTarget ? Position.Top : Position.Bottom);
      }
    },
    [nodes, edges, removeNode, extendNode]
  );

  const edgeRemove = useCallback(
    (evt: any, edgeData: any) => {
      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (edgeData.source === nodes[i].id) {
          if (node.type !== "memo") {
            removeNode(node.id);
            return;
          }
        } else if (edgeData.target === nodes[i].id) {
          if (node.type !== "memo") {
            removeNode(node.id);
            return;
          }
        }
      }
    },
    [nodes, removeNode]
  );

  const clearSelection = useCallback(() => {
    nodes.forEach((node, index) => {
      node.selected = false;
      node.data.isSelected = false;
      node.zIndex = index;
    });
    setNodes([...nodes]);
  }, [nodes]);

  const selectNode = useCallback(
    (evt: any, data: any) => {
      nodes.forEach((node, index) => {
        node.selected = false;
        node.data.isSelected = false;
        node.zIndex = index;
      });
      const selectedNode = nodes.filter((node) => node.id === data.id)[0];
      selectedNode.selected = true;
      selectedNode.data.isSelected = true;
      selectedNode.zIndex = nodes.length;
      setNodes([...nodes]);
    },
    [nodes]
  );

  return (
    <div style={{ height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onPaneClick={clearSelection}
        onNodeClick={selectNode}
        onEdgeClick={edgeRemove}
        onNodeDragStart={selectNode}
        onConnectStart={handleNodeExpand}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default MemoFlow;
