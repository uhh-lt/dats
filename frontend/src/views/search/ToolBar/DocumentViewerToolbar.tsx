import { Box, Toolbar } from "@mui/material";
import BackButton from "./ToolBarElements/BackButton";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import TagMenuButton from "./ToolBarElements/TagMenuButton";
import DeleteButton from "./ToolBarElements/DeleteButton";
import ToggleShowEntitiesButton from "./ToolBarElements/ToggleShowEntitiesButton";
import DocumentNavigation from "../../../components/DocumentNavigation";
import * as React from "react";
import AnnotateButton from "./ToolBarElements/AnnotateButton";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi";

interface DocumentViewerToolbarProps {
  sdocId: number;
  searchResultIds: number[];
}

function DocumentViewerToolbar({ sdocId, searchResultIds }: DocumentViewerToolbarProps) {
  // router
  const { projectId } = useParams() as { projectId: string };

  return (
    <Toolbar disableGutters variant="dense" sx={{ minHeight: "52px", p: "0px 4px" }}>
      <BackButton />
      <AnnotateButton projectId={projectId} sdocId={sdocId} />
      <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} />
      <TagMenuButton forceSdocId={sdocId} popoverOrigin={{ horizontal: "center", vertical: "bottom" }} />
      <DeleteButton disabled />
      <ToggleShowEntitiesButton />

      <Box sx={{ flexGrow: 1 }} />

      <DocumentNavigation idsToNavigate={searchResultIds} searchPrefix="../search/doc/" showText={true} />
    </Toolbar>
  );
}

export default DocumentViewerToolbar;
