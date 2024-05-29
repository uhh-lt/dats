import { AppBar, AppBarProps, Box, Toolbar, Typography } from "@mui/material";
import { useRef } from "react";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import DocumentNavigation from "../../../components/DocumentNavigation.tsx";
import ExporterButton from "../../../features/Exporter/ExporterButton.tsx";
import MemoButton from "../../../features/Memo/MemoButton.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import SearchFilterDialog from "../SearchFilterDialog.tsx";
import AnnotateButton from "./ToolBarElements/AnnotateButton.tsx";
import BackButton from "./ToolBarElements/BackButton.tsx";
import DeleteButton from "./ToolBarElements/DeleteButton.tsx";
import DownloadButton from "./ToolBarElements/DownloadButton.tsx";
import DownloadSdocsButton from "./ToolBarElements/DownloadSdocsButton.tsx";
import TableNavigation from "./ToolBarElements/TableNavigation.tsx";
import TagMenuButton from "./ToolBarElements/TagMenu/TagMenuButton.tsx";
import ToggleAllDocumentsButton from "./ToolBarElements/ToggleAllDocumentsButton.tsx";
import ToggleShowEntitiesButton from "./ToolBarElements/ToggleShowEntitiesButton.tsx";
import ToggleShowTagsButton from "./ToolBarElements/ToggleShowTagsButton.tsx";
import ToggleSplitViewButton from "./ToolBarElements/ToggleSplitViewButton.tsx";
import ToggleTableView from "./ToolBarElements/ToggleTableViewButton.tsx";

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
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);

  // local client state
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  return (
    <AppBar
      position="relative"
      variant="outlined"
      elevation={0}
      ref={filterDialogAnchorRef}
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        height: "48px",
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
            <ToggleAllDocumentsButton
              numSelectedDocuments={selectedDocumentIds.length}
              sdocIds={searchResultDocumentIds}
            />
            {selectedDocumentIds.length > 0 && (
              <>
                <Typography color="inherit" variant="subtitle1" component="div">
                  {selectedDocumentIds.length} selected
                </Typography>
                <TagMenuButton
                  selectedSdocIds={selectedDocumentIds}
                  popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
                />
                <DeleteButton sdocIds={selectedDocumentIds} navigateTo="../search" />
                <DownloadSdocsButton sdocIds={selectedDocumentIds} />
              </>
            )}
            <SearchFilterDialog anchorEl={filterDialogAnchorRef.current} />
            <Box sx={{ flexGrow: 1 }} />
            <TableNavigation numDocuments={numSearchResults} />
            <ToggleShowTagsButton />
            <ToggleSplitViewButton />
            <ToggleTableView />
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
            <TagMenuButton
              selectedSdocIds={[sdocId]}
              forceSdocId={sdocId}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
            <DeleteButton sdocIds={[sdocId]} navigateTo="../search" />
            <ToggleShowEntitiesButton />
            <DownloadButton sdocId={sdocId} />
            <ExporterButton
              tooltip="Export annotations of this document"
              exporterInfo={{ type: "Annotations", sdocId: sdocId, singleUser: true, users: [] }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <DocumentNavigation idsToNavigate={searchResultDocumentIds} searchPrefix="../annotation/" showText={true} />
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default SearchToolbar;
