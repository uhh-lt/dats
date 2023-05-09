import { useState, useCallback, useMemo } from "react";
import ReactFlow, { Controls, Background, applyNodeChanges, NodeChange } from "reactflow";
import "reactflow/dist/style.css";
import { MemoRead } from "../../api/openapi";
import MemoNode from "./MemoNode";

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

  const initialEdges = [{ id: "1-2", source: "1", target: "2", label: "to the", type: "smoothstep" }];

  const nodeTypes = useMemo(() => ({ memo: MemoNode }), []);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

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

  /*
  const addNode = () => {
    setNodes((prevState) => {
      prevState.push({
        id: "sdoc-1",
        data: 1, // attached object id
        type: "sdoc", //attached object type,
        position: { x: 220 + 10, y: 0 },
      });
    });
    setEdges((prevState) => {
      prevState.push();
    });
  };
   */

  return (
    <div style={{ height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onPaneClick={clearSelection}
        onNodeClick={selectNode}
        onNodeDragStart={selectNode}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {/* ContextMenu */}
    </div>
  );
}

export default MemoFlow;
