import { CardContent, Divider, TextField, Toolbar, Typography } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import CodeTreeView from "../../annotation/CodeExplorer/CodeTreeView";
import CodeEditButton from "../../annotation/CodeExplorer/CodeEditButton";
import Tree, { Node } from "ts-tree-structure";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import { codesToTree } from "../../annotation/CodeExplorer/TreeUtils";
import CodeEditDialog from "../../annotation/CodeExplorer/CodeEditDialog";
import CodeToggleEnabledButton from "../../annotation/CodeExplorer/CodeToggleEnabledButton";
import { filter } from "lodash";

interface ProjectCodesProps {
  project: ProjectRead;
}

function ProjectCodes({ project }: ProjectCodesProps) {
  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(project.id, true);

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
          { strategy: "breadth" }
        );

        // filter the codeTree
        let nodes_to_remove = codeTree.all((node) => !nodesToKeep.has(node.model.code.id));
        nodes_to_remove.forEach((node) => {
          node.drop();
        });
      }

      return { codeTree, nodesToExpand };
    } else {
      return { codeTree: null, nodesToExpand: new Set<number>() };
    }
  }, [projectCodes.data, codeFilter]);

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

  return (
    <>
      <Toolbar variant="dense" style={{ paddingRight: "8px" }}>
        <Typography variant="h6" color="inherit" component="div">
          Filter codes
        </Typography>
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
        <CodeToggleEnabledButton code={codeTree?.model} />
      </Toolbar>
      <Divider />

      {projectCodes.isLoading && <CardContent>Loading project codes...</CardContent>}
      {projectCodes.isError && (
        <CardContent>An error occurred while loading project codes for project {project.id}...</CardContent>
      )}
      {projectCodes.isSuccess && codeTree && (
        <>
          <CodeTreeView
            className="myFlexFillAllContainer"
            data={codeTree.model}
            multiSelect={false}
            disableSelection
            expanded={expandedCodeIds}
            onExpandClick={handleExpandClick}
            onCollapseClick={handleCollapseClick}
            renderActions={(node) => (
              <>
                <CodeEditButton code={node.code} />
                <CodeToggleEnabledButton code={node} />
              </>
            )}
          />
          <CodeEditDialog codes={projectCodes.data} />
        </>
      )}
    </>
  );
}

export default ProjectCodes;
