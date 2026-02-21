import { Box, Checkbox, Typography } from "@mui/material";
import { useRef } from "react";
import { ExportSdocsButton } from "../../../components/Export/ExportSdocsButton.tsx";
import { ReduxFilterDialog } from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { DATSToolbar } from "../../../components/MUI/DATSToolbar.tsx";
import { DeleteSdocsButton } from "../../../core/source-document/DeleteSdocsButton.tsx";
import { TagMenuButton } from "../../../core/tag/menu/TagMenuButton.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import { ImageSimilaritySearchOptionsMenu } from "./ImageSimilaritySearchOptionsMenu.tsx";
import { SearchBar } from "./SearchBar.tsx";
import { ImageSearchActions } from "./imageSearchSlice.ts";

// this has to match ImageSimilaritySearch.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "imageSimilaritySearch";

interface ImageSimilarityToolbarProps {
  searchResultDocumentIds: number[];
}

export function ImageSimilaritySearchToolbar({ searchResultDocumentIds }: ImageSimilarityToolbarProps) {
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
    <DATSToolbar disableGutters variant="dense" ref={filterDialogAnchorRef}>
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
      <ExportSdocsButton sdocIds={selectedDocumentIds} />
    </DATSToolbar>
  );
}
