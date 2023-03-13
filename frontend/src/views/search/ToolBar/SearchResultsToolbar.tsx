import { Box, Toolbar, ToolbarProps, Typography } from "@mui/material";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import DeleteButton from "./ToolBarElements/DeleteButton";
import TableNavigation from "./ToolBarElements/TableNavigation";
import TagMenuButton from "./ToolBarElements/TagMenuButton";
import ToggleAllDocumentsButton from "./ToolBarElements/ToggleAllDocumentsButton";
import ToggleListViewButton from "./ToolBarElements/ToggleListViewButton";
import ToggleShowTagsButton from "./ToolBarElements/ToggleShowTagsButton";
import ToggleSplitViewButton from "./ToolBarElements/ToggleSplitViewButton";

interface SearchResultsToolbarProps {
  searchResultDocumentIds: number[];
  numSearchResults: number;
}

function SearchResultsToolbar({
  searchResultDocumentIds,
  numSearchResults,
  ...props
}: SearchResultsToolbarProps & ToolbarProps) {
  // global client state (redux)
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);
  const isListView = useAppSelector((state) => state.search.isListView);

  return (
    <Toolbar disableGutters variant="dense" sx={{ minHeight: "52px", p: "0px 4px" }} {...props}>
      {!isListView && <ToggleAllDocumentsButton sdocIds={searchResultDocumentIds} />}
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
