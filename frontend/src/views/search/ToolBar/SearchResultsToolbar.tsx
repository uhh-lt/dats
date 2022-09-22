import { Box, Toolbar, ToolbarProps, Typography } from "@mui/material";
import TagMenuButton from "./ToolBarElements/TagMenuButton";
import DeleteButton from "./ToolBarElements/DeleteButton";
import TableNavigation from "./ToolBarElements/TableNavigation";
import ToggleShowTagsButton from "./ToolBarElements/ToggleShowTagsButton";
import ToggleListViewButton from "./ToolBarElements/ToggleListViewButton";
import ToggleSplitViewButton from "./ToolBarElements/ToggleSplitViewButton";
import * as React from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import ToggleAllDocumentsButton from "./ToolBarElements/ToggleAllDocumentsButton";

interface SearchResultsToolbarProps {
  searchResultIds: number[];
}

function SearchResultsToolbar({ searchResultIds, ...props }: SearchResultsToolbarProps & ToolbarProps) {
  // global client state (redux)
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);
  const isListView = useAppSelector((state) => state.search.isListView);

  // computed
  const numSearchResults = searchResultIds.length;

  return (
    <Toolbar disableGutters variant="dense" sx={{ minHeight: "52px", p: "0px 4px" }} {...props}>
      {!isListView && <ToggleAllDocumentsButton searchResultIds={searchResultIds} />}
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
      <ToggleListViewButton />
      <ToggleSplitViewButton />
    </Toolbar>
  );
}

export default SearchResultsToolbar;
