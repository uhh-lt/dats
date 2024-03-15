import { Box } from "@mui/material";
import React, { useState } from "react";
import { Node } from "ts-tree-structure";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import CodeToggleEnabledButton from "../../annotation/CodeExplorer/CodeToggleEnabledButton.tsx";
import CodeToggleVisibilityButton from "../../annotation/CodeExplorer/CodeToggleVisibilityButton.tsx";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree.ts";
import { ProjectProps } from "./ProjectProps.ts";

function ProjectCodes({ project }: ProjectProps) {
  // custom hooks
  let { codeTree, allCodes } = useComputeCodeTree(true);

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  const [codeFilter, setCodeFilter] = useState<string>("");

  // handle ui events
  const handleSelectCode = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
    dispatch(AnnoActions.setSelectedParentCodeId(selectedCodeId === id ? undefined : id));
  };
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    dispatch(AnnoActions.setExpandedParentCodeIds([nodeId, ...expandedCodeIds]));
    // dispatch(AnnotationActions.setSelectedParentCodeId(parseInt(nodeId)));
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    dispatch(AnnoActions.setExpandedParentCodeIds(newCodeIds));
    // dispatch(AnnotationActions.setSelectedParentCodeId(parseInt(nodeId)));
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <TreeExplorer
        sx={{ pt: 0 }}
        dataType={KEYWORD_CODES}
        dataIcon={SquareIcon}
        showButtons
        selectedDataId={selectedCodeId}
        expandedDataIds={expandedCodeIds}
        dataFilter={codeFilter}
        setDataFilter={setCodeFilter}
        dataTree={codeTree as Node<ICodeTree>}
        allData={allCodes}
        handleCollapseClick={handleCollapseClick}
        handleExpandClick={handleExpandClick}
        handleSelectData={handleSelectCode}
        // actions
        renderActions={(node) => {
          return (
            <>
              <CodeToggleVisibilityButton code={node as ICodeTree} />
              <CodeToggleEnabledButton code={node as ICodeTree} />
            </>
          );
        }}
        renderFilterActions={() => (
          <>
            <CodeToggleEnabledButton code={codeTree?.model} />
          </>
        )}
      />
      <TreeDataCreateDialog dataType={KEYWORD_CODES} />
    </Box>
  );
}

export default ProjectCodes;
