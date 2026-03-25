import { SdocColumns } from "@api/models/SdocColumns";
import { StringOperator } from "@api/models/StringOperator";
import { DATSToolbar } from "@components/DATSToolbar";
import { URLFilterDialog } from "@core/filter";
import { DeleteSdocsButton, SdocExportButton } from "@core/source-document";
import { TagMenuButton } from "@core/tag";
import { Box, Checkbox, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useState } from "react";
import { SearchActions } from "../../../store/documentSearchSlice";
import { ImageSearchActions } from "../../../store/imageSearchSlice";
import { ImageSearchRouteAPI } from "../_hooks/imageSearchRouteAPI";
import { ImageSimilaritySearchOptionsMenu } from "./ImageSimilaritySearchOptionsMenu";
import { SearchBar } from "./SearchBar";

const filterName = "imageSimilaritySearch";
const defaultFilterExpression = {
  id: "",
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

interface ImageSimilarityToolbarProps {
  searchResultDocumentIds: number[];
}

export function ImageSimilaritySearchToolbar({ searchResultDocumentIds }: ImageSimilarityToolbarProps) {
  // global client state (redux)
  const selectedDocumentIds = useAppSelector((state) => state.imageSearch.selectedDocumentIds);
  const dispatch = useAppDispatch();

  // local client state
  const [filterDialogAnchor, setFilterDialogAnchor] = useState<HTMLDivElement | null>(null);

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
    <DATSToolbar disableGutters variant="dense" ref={setFilterDialogAnchor}>
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
          <DeleteSdocsButton
            sdocIds={selectedDocumentIds}
            onDeleted={(ids) => dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(ids))}
          />
        </>
      )}
      <Box sx={{ flexGrow: 1 }} />
      <URLFilterDialog
        anchorEl={filterDialogAnchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        filterName={filterName}
        routeApi={ImageSearchRouteAPI}
        defaultFilterExpression={defaultFilterExpression}
        column2InfoSelector={(state) => state.search.column2Info}
      />
      <SearchBar placeholder="Search for images" />
      <ImageSimilaritySearchOptionsMenu />
      <SdocExportButton sdocIds={selectedDocumentIds} />
    </DATSToolbar>
  );
}
