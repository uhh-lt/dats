import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, memo, useEffect, useRef, useState } from "react";
import { ReduxFilterDialog } from "../../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { DATSToolbar } from "../../../../components/MUI/DATSToolbar.tsx";
import { TagMenuButton } from "../../../../core/tag/menu/TagMenuButton.tsx";
import { useDebounce } from "../../../../hooks/useDebounce.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../../store/store.ts";
import { PerspectivesActions } from "../../perspectivesSlice.ts";
import { ClusterMenuButton } from "./ClusterMenuButton.tsx";
import { ClusterReviewButtons } from "./ClusterReviewButtons.tsx";

const filterStateSelector = (state: RootState) => state.perspectives;

interface MapToolbarProps {
  aspectId: number;
}

export const MapToolbar = memo(({ aspectId }: MapToolbarProps) => {
  // selection
  const selectedDocumentIds = useAppSelector((state) => state.perspectives.selectedSdocIds);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // filter dialog
  const toolbarRef = useRef<HTMLDivElement>(null);

  // search bar
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  useEffect(() => {
    dispatch(PerspectivesActions.onChangeSearchQuery(debouncedSearchQuery));
  }, [debouncedSearchQuery, dispatch]);

  return (
    <DATSToolbar variant="dense" ref={toolbarRef}>
      {selectedDocumentIds.length > 0 && (
        <Stack direction="row" alignItems="center">
          <Typography color="textSecondary">
            {selectedDocumentIds.length} doc{selectedDocumentIds.length > 1 ? "s" : ""} selected
          </Typography>
          <ClusterMenuButton
            aspectId={aspectId}
            selectedSdocIds={selectedDocumentIds}
            popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            colorScheme={colorScheme}
          />
          <TagMenuButton
            selectedSdocIds={selectedDocumentIds}
            popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
          />
          <ClusterReviewButtons aspectId={aspectId} selectedSdocIds={selectedDocumentIds} />
        </Stack>
      )}
      <Box sx={{ flexGrow: 1 }} />
      <ReduxFilterDialog
        anchorEl={toolbarRef.current}
        buttonProps={{ size: "small" }}
        filterName={`aspect-${aspectId}`}
        filterStateSelector={filterStateSelector}
        filterActions={PerspectivesActions}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      />
      <TextField
        type="text"
        value={searchQuery}
        onChange={handleSearchQueryChange}
        placeholder="Search documents ..."
        variant="outlined"
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
    </DATSToolbar>
  );
});
