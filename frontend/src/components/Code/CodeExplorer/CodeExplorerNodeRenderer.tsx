import { Typography } from "@mui/material";
import { useCallback } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions, isHiddenCodeId } from "../../../views/annotation/annoSlice.ts";
import { ITree } from "../../TreeExplorer/ITree.ts";

interface CodeExplorerNodeRendererProps {
  node: ITree<CodeRead>;
}

function CodeExplorerNodeRenderer({ node }: CodeExplorerNodeRendererProps) {
  const isHidden = useAppSelector(isHiddenCodeId(node.data.id));
  const dispatch = useAppDispatch();

  const handleMouseEnter = useCallback(() => {
    dispatch(AnnoActions.setHoveredCodeId(node.data.id));
  }, [dispatch, node.data.id]);

  const handleMouseLeave = useCallback(() => {
    dispatch(AnnoActions.setHoveredCodeId(undefined));
  }, [dispatch]);

  return (
    <Typography
      variant="body2"
      sx={{ fontWeight: "inherit", flexGrow: 1, ...(isHidden && { textDecoration: "line-through" }) }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {node.data.name}
    </Typography>
  );
}

export default CodeExplorerNodeRenderer;
