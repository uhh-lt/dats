import { CardContent } from "@mui/material";
import React, { useMemo, useState } from "react";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import CodeTreeView from "../../annotation/CodeExplorer/CodeTreeView";
import CodeEditButton from "../../annotation/CodeExplorer/CodeEditButton";
import Tree, { Node } from "ts-tree-structure";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import { codesToTree } from "../../annotation/CodeExplorer/TreeUtils";
import CodeEditDialog from "../../annotation/CodeExplorer/CodeEditDialog";

interface ProjectCodesProps {
  project: ProjectRead;
}

function ProjectCodes({ project }: ProjectCodesProps) {
  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(project.id);

  // computed
  const codeTree: Node<ICodeTree> | null = useMemo(() => {
    if (projectCodes.data) {
      const tree = new Tree();
      return tree.parse<ICodeTree>(codesToTree(projectCodes.data));
    } else {
      return null;
    }
  }, [projectCodes.data]);

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
            renderActions={(node) => <CodeEditButton code={node.code} />}
          />
          <CodeEditDialog codes={projectCodes.data} />
        </>
      )}
    </>
  );
}

export default ProjectCodes;
