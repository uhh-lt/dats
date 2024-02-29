import { Box, BoxProps, TextField, Toolbar } from "@mui/material";
import { MultiSelectTreeViewProps, SingleSelectTreeViewProps } from "@mui/x-tree-view";
import React, { SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import Tree from "ts-tree-structure";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import CodeTreeView, { CodeTreeViewProps } from "../../views/annotation/CodeExplorer/CodeTreeView.tsx";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree.ts";
import { codesToTree } from "../../views/annotation/CodeExplorer/TreeUtils.ts";

interface CodeSelectorProps {
  projectId: number;
  setSelectedCodes: (codes: CodeRead[]) => void;
  allowMultiselect: boolean;
}

function CodeSelector({
  projectId,
  setSelectedCodes,
  allowMultiselect,
  ...props
}: CodeSelectorProps & Omit<BoxProps, "className">) {
  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");
  const expandCodes = useCallback((codesToExpand: string[]) => {
    setExpandedCodeIds((prev) => {
      for (const codeId of codesToExpand) {
        if (prev.indexOf(codeId) === -1) {
          prev.push(codeId);
        }
      }
      return prev.slice();
    });
  }, []);

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  // computed
  const { codeTree, nodesToExpand } = useMemo(() => {
    if (projectCodes.data) {
      // build the tree
      const codeTree = new Tree().parse<ICodeTree>(codesToTree(projectCodes.data));

      const nodesToExpand = new Set<number>();

      if (codeFilter.trim().length > 0) {
        const nodesToKeep = new Set<number>();

        // find all nodes that match the filter
        codeTree.walk(
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

        // filter the codeTree
        const nodes_to_remove = codeTree.all((node) => !nodesToKeep.has(node.model.code.id));
        nodes_to_remove.forEach((node) => {
          node.drop();
        });
      }

      return { codeTree, nodesToExpand };
    } else {
      return { codeTree: null, nodesToExpand: new Set<number>() };
    }
  }, [projectCodes.data, codeFilter]);

  // automatically expand filtered nodes
  useEffect(() => {
    expandCodes(Array.from(nodesToExpand).map((id) => id.toString()));
  }, [expandCodes, nodesToExpand]);

  // ui event handlers
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    expandCodes([nodeId]);
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    setExpandedCodeIds(newCodeIds);
  };

  return (
    <Box className="myFlexContainer" {...props}>
      <Toolbar variant="dense" className="myFlexFitContentContainer">
        <TextField
          sx={{ flex: 1 }}
          placeholder={"search/filter codes by name..."}
          variant="outlined"
          size="small"
          value={codeFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCodeFilter(event.target.value);
          }}
        />
      </Toolbar>
      {projectCodes.isLoading && <div>Loading project codes...</div>}
      {projectCodes.isError && <div>An error occurred while loading project codes for project {projectId}...</div>}
      {projectCodes.isSuccess && codeTree && (
        <>
          {allowMultiselect ? (
            <CodeBrowserWithMultiselect
              className="myFlexFillAllContainer"
              codes={projectCodes.data}
              setSelectedCodes={setSelectedCodes}
              data={codeTree.model}
              expanded={expandedCodeIds}
              onExpandClick={handleExpandClick}
              onCollapseClick={handleCollapseClick}
            />
          ) : (
            <CodeBrowserWithSingleselect
              className="myFlexFillAllContainer"
              codes={projectCodes.data}
              setSelectedCodes={setSelectedCodes}
              data={codeTree.model}
              expanded={expandedCodeIds}
              onExpandClick={handleExpandClick}
              onCollapseClick={handleCollapseClick}
            />
          )}
        </>
      )}
    </Box>
  );
}

export default CodeSelector;

interface CodeBrowserWithMultiselectProps {
  codes: CodeRead[];
  setSelectedCodes: (codes: CodeRead[]) => void;
}

function CodeBrowserWithMultiselect({
  codes,
  setSelectedCodes,
  ...props
}: CodeBrowserWithMultiselectProps &
  CodeTreeViewProps &
  Omit<MultiSelectTreeViewProps, "multiselect" | "selected" | "onNodeSelect">) {
  // code selection
  const [selected, setSelected] = useState<string[]>([]);
  const handleSelect = (_event: SyntheticEvent<Element, Event>, nodeIds: string | string[]) => {
    if (!Array.isArray(nodeIds)) return;

    const newSelectedCodeIds = [...selected];
    for (const nodeId of nodeIds) {
      if (newSelectedCodeIds.indexOf(nodeId) === -1) {
        newSelectedCodeIds.push(nodeId);
      } else {
        newSelectedCodeIds.splice(newSelectedCodeIds.indexOf(nodeId), 1);
      }
    }
    setSelected(newSelectedCodeIds);
    const codeIds = newSelectedCodeIds.map((id) => parseInt(id));
    // todo: this is probably very inefficient
    setSelectedCodes(codes.filter((code) => codeIds.indexOf(code.id) !== -1));
  };

  return <CodeTreeView multiSelect selected={selected} onNodeSelect={handleSelect} {...props} />;
}

function CodeBrowserWithSingleselect({
  codes,
  setSelectedCodes,
  ...props
}: CodeBrowserWithMultiselectProps &
  CodeTreeViewProps &
  Omit<SingleSelectTreeViewProps, "multiselect" | "selected" | "onNodeSelect">) {
  // code selection
  const [selected, setSelected] = useState<string>("");
  const handleSelect = (_event: SyntheticEvent<Element, Event>, nodeIds: string | string[]) => {
    if (Array.isArray(nodeIds)) return;

    setSelected(nodeIds);
    const codeIds = [parseInt(nodeIds)];
    setSelectedCodes(codes.filter((code) => codeIds.indexOf(code.id) !== -1));
  };

  return <CodeTreeView selected={selected} onNodeSelect={handleSelect} {...props} />;
}
