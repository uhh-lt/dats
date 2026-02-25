import { DATSToolbar } from "@components/DATSToolbar";
import { ReduxFilterDialog } from "@components/filter/redux-filter-dialog/index";
import { Box, Checkbox, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useRef } from "react";
import { DeleteSdocsButton } from "../../../../../core/source-document/DeleteSdocsButton";
import { SdocExportButton } from "../../../../../core/source-document/SdocExportButton";
import { TagMenuButton } from "../../../../../core/tag/menu/TagMenuButton";
import { RootState } from "../../../../../store/store";
import { SearchActions } from "../../../store/documentSearchSlice";
import { ImageSearchActions } from "../../../store/imageSearchSlice";
import { ImageSimilaritySearchOptionsMenu } from "./ImageSimilaritySearchOptionsMenu";
import { SearchBar } from "./SearchBar";

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
      <SdocExportButton sdocIds={selectedDocumentIds} />
    </DATSToolbar>
  );
}
