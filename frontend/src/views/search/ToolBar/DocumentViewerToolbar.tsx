import { Box, Toolbar } from "@mui/material";
import BackButton from "./ToolBarElements/BackButton";
import MemoButton from "../../../features/Memo/MemoButton";
import TagMenuButton from "./ToolBarElements/TagMenuButton";
import DeleteButton from "./ToolBarElements/DeleteButton";
import ToggleShowEntitiesButton from "./ToolBarElements/ToggleShowEntitiesButton";
import DocumentNavigation from "../../../components/DocumentNavigation";
import * as React from "react";
import AnnotateButton from "./ToolBarElements/AnnotateButton";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi";
import DownloadButton from "./ToolBarElements/DownloadButton";
import ExporterButton from "../../../features/Exporter/ExporterButton";

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
      <DeleteButton sdocId={sdocId} />
      <ToggleShowEntitiesButton />
      <DownloadButton sdocId={sdocId} />
      <ExporterButton
        tooltip="Export annotations of this document"
        exporterInfo={{ type: "Annotations", sdocId: sdocId, singleUser: true, users: [] }}
      />

      <Box sx={{ flexGrow: 1 }} />

      <DocumentNavigation idsToNavigate={searchResultIds} searchPrefix="../search/doc/" showText={true} />
    </Toolbar>
  );
}

export default DocumentViewerToolbar;
