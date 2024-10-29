import { Box, Checkbox, Toolbar, Typography } from "@mui/material";
import { useRef } from "react";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import ImageSimilaritySearchOptionsMenu from "./ImageSimilaritySearchOptionsMenu.tsx";
import SearchBar from "./SearchBar.tsx";
import { ImageSearchActions } from "./imageSearchSlice.ts";

// this has to match ImageSimilaritySearch.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "imageSimilaritySearch";

interface ImageSimilarityToolbarProps {
  searchResultDocumentIds: number[];
}

function ImageSimilaritySearchToolbar({ searchResultDocumentIds }: ImageSimilarityToolbarProps) {
  // global client state (redux)
  const selectedDocumentIds = useAppSelector((state) => state.imageSearch.selectedDocumentIds);
  const dispatch = useAppDispatch();

  // local client state
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  // toggle documents button
  const numSelectedDocuments = selectedDocumentIds.length;
  const handleToggleAllClick = () => {
    if (numSelectedDocuments === searchResultDocumentIds.length) {
      dispatch(ImageSearchActions.clearSelectedDocuments());
      return;
    }
    dispatch(ImageSearchActions.setSelectedDocuments(searchResultDocumentIds));
  };

  return (
    <Toolbar
      disableGutters
      variant="dense"
      sx={{
        px: 1,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        bgcolor: (theme) => theme.palette.background.paper,
        borderBottom: "1px solid #e8eaed",
        boxShadow: 4,
        gap: 1,
      }}
      ref={filterDialogAnchorRef}
    >
      <Checkbox
        color="primary"
        indeterminate={numSelectedDocuments > 0 && numSelectedDocuments < searchResultDocumentIds.length}
        checked={numSelectedDocuments === searchResultDocumentIds.length}
        onChange={handleToggleAllClick}
      />
      {selectedDocumentIds.length > 0 && (
        <>
          <Typography variant="subtitle1" component="div">
            {selectedDocumentIds.length} selected
          </Typography>
          <TagMenuButton
            selectedSdocIds={selectedDocumentIds}
            popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
          />
          <DeleteSdocsButton sdocIds={selectedDocumentIds} navigateTo="../search" />
          <DownloadSdocsButton sdocIds={selectedDocumentIds} />
        </>
      )}
      <Box sx={{ flexGrow: 1 }} />
      <ReduxFilterDialog
        anchorEl={filterDialogAnchorRef.current}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={SearchActions}
      />
      <SearchBar placeholder="Search for images" />
      <ImageSimilaritySearchOptionsMenu />
    </Toolbar>
  );
}

export default ImageSimilaritySearchToolbar;
