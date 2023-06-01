import { AppBar, AppBarProps, Box, Toolbar, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi";
import DocumentNavigation from "../../../components/DocumentNavigation";
import ExporterButton from "../../../features/Exporter/ExporterButton";
import MemoButton from "../../../features/Memo/MemoButton";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import AnnotateButton from "./ToolBarElements/AnnotateButton";
import BackButton from "./ToolBarElements/BackButton";
import DeleteButton from "./ToolBarElements/DeleteButton";
import DownloadButton from "./ToolBarElements/DownloadButton";
import TableNavigation from "./ToolBarElements/TableNavigation";
import TagMenuButton from "./ToolBarElements/TagMenuButton";
import ToggleAllDocumentsButton from "./ToolBarElements/ToggleAllDocumentsButton";
import ToggleShowEntitiesButton from "./ToolBarElements/ToggleShowEntitiesButton";
import ToggleShowTagsButton from "./ToolBarElements/ToggleShowTagsButton";
import ToggleSplitViewButton from "./ToolBarElements/ToggleSplitViewButton";

interface DocumentViewerToolbarProps {
  sdocId: number | undefined | null;
}

interface SearchResultsToolbarProps {
  searchResultDocumentIds: number[];
  numSearchResults: number;
  viewDocument: boolean;
  isSplitView: boolean;
}

function SearchToolbar({
  searchResultDocumentIds,
  numSearchResults,
  sdocId,
  viewDocument,
  isSplitView,
  ...props
}: SearchResultsToolbarProps & DocumentViewerToolbarProps & AppBarProps) {
  // router
  const { projectId } = useParams() as { projectId: string };

  // global client state (redux)
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);

  return (
    <AppBar
      position="relative"
      variant="outlined"
      elevation={0}
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        minHeight: "52px",
        p: "0px 4px",
        zIndex: (theme) => theme.zIndex.appBar,
        boxShadow: 4,
        color: (theme) => theme.palette.text.primary,
        ...props.sx,
      }}
      {...props}
    >
      <Toolbar disableGutters variant="dense">
        {!(viewDocument && !isSplitView) && (
          <Box
            style={{
              display: "flex",
              width: isSplitView ? "50%" : "100%",
              alignItems: "center",
              paddingRight: isSplitView ? "8px" : undefined,
            }}
            sx={{ borderRight: (theme) => (isSplitView ? `1px solid ${theme.palette.grey[400]}` : undefined) }}
          >
            <ToggleAllDocumentsButton sdocIds={searchResultDocumentIds} />
            {numSelectedDocuments > 0 && (
              <>
                <Typography color="inherit" variant="subtitle1" component="div">
                  {numSelectedDocuments} selected
                </Typography>
                <TagMenuButton popoverOrigin={{ horizontal: "center", vertical: "bottom" }} />
                <DeleteButton sdocId={-1} disabled />
              </>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <TableNavigation numDocuments={numSearchResults} />
            <ToggleShowTagsButton />
            <ToggleSplitViewButton />
          </Box>
        )}
        {sdocId && (
          <Box
            style={{
              display: "flex",
              width: viewDocument && !isSplitView ? "100%" : "50%",
              paddingLeft: isSplitView ? "8px" : undefined,
            }}
          >
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
            <DocumentNavigation idsToNavigate={searchResultDocumentIds} searchPrefix="../search/doc/" showText={true} />
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default SearchToolbar;
