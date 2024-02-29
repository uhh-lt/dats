import { Checkbox, Divider, TextField, Toolbar } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import Tree from "ts-tree-structure";
import CodeTreeView from "../../views/annotation/CodeExplorer/CodeTreeView.tsx";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree.ts";
import { flatTree } from "../../views/annotation/CodeExplorer/TreeUtils.ts";

interface ExporterTreeSelectProps {
  tree: ICodeTree | undefined;
  value: number[];
  onChange: (value: number[]) => void;
}

function ExporterTreeSelect({ tree, value, onChange }: ExporterTreeSelectProps) {
  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");

  // computed
  const numTreeItems = useMemo(() => (tree ? flatTree(tree).length : -1), [tree]);
  const { filteredCodeTree, nodesToExpand } = useMemo(() => {
    if (tree) {
      // build the tree
      const filteredCodeTree = new Tree().parse<ICodeTree>(structuredClone(tree));

      const nodesToExpand = new Set<number>();

      if (codeFilter.trim().length > 0) {
        const nodesToKeep = new Set<number>();

        // find all nodes that match the filter
        filteredCodeTree.walk(
          (node) => {
            if (node.model.code.name.startsWith(codeFilter.trim())) {
              // keep the node
              nodesToKeep.add(node.model.code.id);

              // keep its children
              node.children.map((child) => child.model.code.id).forEach((id) => nodesToKeep.add(id));

              // keep its parents
              let parent = node.parent;
              while (parent) {
                nodesToKeep.add(parent.model.code.id);
                nodesToExpand.add(parent.model.code.id);
                parent = parent.parent;
              }
            }
            return true;
          },
          { strategy: "breadth" },
        );

        // filter the filteredCodeTree
        const nodes_to_remove = filteredCodeTree.all((node) => !nodesToKeep.has(node.model.code.id));
        nodes_to_remove.forEach((node) => {
          node.drop();
        });
      }

      return { filteredCodeTree, nodesToExpand };
    } else {
      return { filteredCodeTree: null, nodesToExpand: new Set<number>() };
    }
  }, [tree, codeFilter]);

  // effects
  // automatically expand filtered nodes
  useEffect(() => {
    setExpandedCodeIds(Array.from(nodesToExpand).map((id) => id.toString()));
  }, [nodesToExpand]);

  // ui event handlers
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    setExpandedCodeIds([nodeId, ...expandedCodeIds]);
  };

  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    setExpandedCodeIds(newCodeIds);
  };

  const handleToggleAllTreeItems = () => {
    if (!filteredCodeTree) return;

    if (value.length === numTreeItems) {
      onChange([]);
    } else {
      // find tree item and all its children
      const itemIds = [];
      if (filteredCodeTree.children) {
        itemIds.push(...flatTree(filteredCodeTree.model).map((c) => c.id));
      }
      onChange(itemIds);
    }
  };

  const handleToggleTreeItem = (treeItem: ICodeTree) => {
    // find tree item and all its children
    const itemIds = [treeItem.code.id];
    if (treeItem.children) {
      itemIds.push(...flatTree(treeItem).map((c) => c.id));
    }

    const treeItemId = itemIds[0];
    const newValue = value;
    if (newValue.indexOf(treeItemId) === -1) {
      // add codes
      itemIds.forEach((treeItemId) => {
        if (newValue.indexOf(treeItemId) === -1) {
          newValue.push(treeItemId);
        }
      });
    } else {
      // delete codes
      itemIds.forEach((treeItemId) => {
        const index = newValue.indexOf(treeItemId);
        if (index !== -1) {
          newValue.splice(index, 1);
        }
      });
    }

    onChange(newValue);
  };

  return (
    <>
      <Toolbar variant="dense" disableGutters sx={{ mr: 2.5 }}>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder={"type name here..."}
          variant="outlined"
          size="small"
          value={codeFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCodeFilter(event.target.value);
          }}
        />
        <Checkbox
          edge="end"
          name={"HI"}
          disabled={filteredCodeTree === undefined}
          onChange={() => handleToggleAllTreeItems()}
          checked={value.length === numTreeItems}
          indeterminate={value.length > 0 && value.length < numTreeItems}
        />
      </Toolbar>
      <Divider />
      {filteredCodeTree && (
        <CodeTreeView
          data={filteredCodeTree.model}
          multiSelect={false}
          disableSelection
          expanded={expandedCodeIds}
          onExpandClick={handleExpandClick}
          onCollapseClick={handleCollapseClick}
          renderActions={(node) => (
            <Checkbox
              name={node.code.name}
              onChange={() => handleToggleTreeItem(node)}
              checked={value.indexOf(node.code.id) !== -1}
            />
          )}
        />
      )}
    </>
  );
}

export default ExporterTreeSelect;
