import * as React from "react";
import { useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import { AppBar, Divider, Paper, Toolbar } from "@mui/material";
import { useParams } from "react-router-dom";
import CodeTreeView from "./CodeTreeView";
import ICodeTree from "./ICodeTree";
import ProjectHooks from "../../../api/ProjectHooks";
import { codesToTree, flatTreeWithRoot } from "./TreeUtils";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import Tree, { Node } from "ts-tree-structure";
import { AnnoActions } from "../annoSlice";
import CodeCreationDialog from "./CodeCreationDialog";
import CodeEditDialog from "./CodeEditDialog";

function CodeExplorer({ ...props }) {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const allCodes = ProjectHooks.useGetAllCodes(projId);

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  // computed
  const codeTree: Node<ICodeTree> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<ICodeTree>(codesToTree(allCodes.data));
    } else {
      return null;
    }
  }, [allCodes.data]);

  // effects
  // update global client state when selection changes
  // we tell the annotator which codes are available for selection in the combobox
  useEffect(() => {
    if (selectedCodeId && codeTree) {
      let parentCode = codeTree.first((node) => node.model.code.id === selectedCodeId);
      dispatch(AnnoActions.setCodesForSelection(flatTreeWithRoot(parentCode!.model)));
    } else {
      dispatch(AnnoActions.setCodesForSelection(allCodes.data || []));
    }
  }, [dispatch, selectedCodeId, allCodes, codeTree]);

  // handle ui events
  const handleSelectCode = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const id = Array.isArray(nodeIds) ? nodeIds[0] : nodeIds;
    dispatch(AnnoActions.setSelectedParentCodeId(parseInt(id)));
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
    <Paper square className="myFlexContainer h100" {...props} elevation={1}>
      <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
        <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
          <Typography variant="h6" color="inherit" component="div">
            Code Explorer
          </Typography>
        </Toolbar>
      </AppBar>
      {allCodes.data && <CodeCreationDialog codes={allCodes.data} projectId={projId} userId={1} />}
      <Divider />
      {codeTree && (
        <CodeTreeView
          className="myFlexFillAllContainer"
          data={codeTree.model}
          multiSelect={false}
          selected={selectedCodeId?.toString() || ""}
          expanded={expandedCodeIds}
          onNodeSelect={handleSelectCode}
          onExpandClick={handleExpandClick}
          onCollapseClick={handleCollapseClick}
        />
      )}
      {allCodes.data && <CodeEditDialog codes={allCodes.data} />}
    </Paper>
  );
}

export default CodeExplorer;
