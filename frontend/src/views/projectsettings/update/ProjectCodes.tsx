import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Tree from "ts-tree-structure";
import ProjectHooks from "../../../api/ProjectHooks";
import { CodeRead } from "../../../api/openapi";
import CodeCreateDialog, { openCodeCreateDialog } from "../../../features/CrudDialog/Code/CodeCreateDialog";
import CodeEditDialog from "../../../features/CrudDialog/Code/CodeEditDialog";
import CodeEditButton from "../../annotation/CodeExplorer/CodeEditButton";
import CodeToggleEnabledButton from "../../annotation/CodeExplorer/CodeToggleEnabledButton";
import CodeToggleVisibilityButton from "../../annotation/CodeExplorer/CodeToggleVisibilityButton";
import CodeTreeView from "../../annotation/CodeExplorer/CodeTreeView";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import { codesToTree } from "../../annotation/CodeExplorer/TreeUtils";
import { ProjectProps } from "./ProjectProps";

function ProjectCodes({ project }: ProjectProps) {
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
          { strategy: "breadth" },
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
  const onCreateCodeSuccess = (code: CodeRead, isNewCode: boolean) => {
    // if we add a new code successfully, we want to show the code in the code explorer
    // this means, we have to expand the parent codes, so the new code is visible
    const codesToExpand = [];
    let parentCodeId = code.parent_code_id;
    while (parentCodeId) {
      codesToExpand.push(parentCodeId);
      parentCodeId = projectCodes.data?.find((code) => code.id === parentCodeId)?.parent_code_id;
    }
    expandCodes(codesToExpand.map((id) => id.toString()));
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
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
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton sx={{ px: 1.5 }} onClick={() => openCodeCreateDialog({ onSuccess: onCreateCodeSuccess })}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create new code" />
          </ListItemButton>
        </ListItem>
      </List>
      <CodeCreateDialog />
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
                <CodeToggleVisibilityButton code={node} />
                <CodeEditButton code={node.code} />
                <CodeToggleEnabledButton code={node} />
              </>
            )}
          />
          <CodeEditDialog codes={projectCodes.data} />
        </>
      )}
    </Box>
  );
}

export default ProjectCodes;
