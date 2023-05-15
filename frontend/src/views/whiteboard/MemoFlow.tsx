import { useCallback, useMemo, useState } from "react";
import ReactFlow, { applyNodeChanges, Background, Controls, NodeChange, Position } from "reactflow";
import "reactflow/dist/style.css";
import { AttachedObjectType, MemoRead } from "../../api/openapi";
import MemoNode from "./nodes/MemoNode";
import SdocNode from "./nodes/SdocNode";
import TagNode from "./nodes/TagNode";

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
      position: { x: 220 * index, y: 0 },
      zIndex: index,
      selected: false,
    };
  });

  const nodeTypes = useMemo(() => ({ memo: MemoNode, sdoc: SdocNode, tag: TagNode }), []);

  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>([]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

  const handleNodeExpand = useCallback(
    (evt: any, data: any) => {
      // TODO: Einklappen von Nodes, wenn auf die bereits verbundene Handle oder die Verbindung geklickt wird
      const node = nodes.filter((node) => node.id === data.nodeId)[0];
      const nodeType = getAttachedTypeNodeCode(node.data.attached_object_type);
      const newNodeId = `${nodeType}-${node.data.attached_object_id}`;
      // FIXME: falls die Node schon aufgeklappt war, muss die Node nur noch umpositioniert und an die
      //  andere Handle geknüpft werden (momentan wird eine neue Node mit gleicher ID erzeugt)
      nodes.push({
        id: newNodeId,
        type: nodeType,
        data: {
          objId: node.data.attached_object_id,
          position: data.handleType === "target" ? Position.Top : Position.Bottom,
          isSelected: false,
        },
        position: {
          x: node.position.x,
          y: node.position.y + (data.handleType === "target" ? -30 : node.height + 30),
        },
      });
      setNodes([...nodes]);
      if (data.handleType === "target") {
        // edge can have a label when setting a string property "label"
        edges.push({ id: `${newNodeId}+${data.nodeId}`, source: newNodeId, target: data.nodeId, type: "smoothstep" });
      } else {
        edges.push({ id: `${data.nodeId}+${newNodeId}`, source: data.nodeId, target: newNodeId, type: "smoothstep" });
      }
      setEdges([...edges]);
    },
    [nodes, edges]
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
