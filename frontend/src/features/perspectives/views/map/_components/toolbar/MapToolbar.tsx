import { DATSToolbar } from "@components/DATSToolbar";
import { ReduxFilterPopover } from "@core/filter";
import { sdocQueries } from "@core/source-document";
import { TagMenuButton } from "@core/tag";
import { useDebounce } from "@hooks/useDebounce";
import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { RootState } from "@store/store";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ChangeEvent, memo, useEffect, useMemo, useState } from "react";
import { PerspectivesActions } from "../../../../store/perspectivesSlice";
import { ClusterMenuButton } from "./ClusterMenuButton";
import { ClusterReviewButtons } from "./ClusterReviewButtons";
import { PerspectivesMapRouteAPI } from "../../_hooks/perspectivesMapRouteAPI";

const filterStateSelector = (state: RootState) => state.perspectives;

interface MapToolbarProps {
  aspectId: number;
}

export const MapToolbar = memo(({ aspectId }: MapToolbarProps) => {
  const { projectId } = PerspectivesMapRouteAPI.useParams();
  // keeps its identity, so that the memoized filter popover does not re-render with every render
  const tableInfoOptions = useMemo(() => sdocQueries.tableInfo(projectId), [projectId]);

  // selection
  const selectedDocumentIds = useAppSelector((state) => state.perspectives.selectedSdocIds);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);

  // filter popover
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);

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
    <DATSToolbar variant="dense" ref={setToolbarEl}>
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
      <ReduxFilterPopover
        anchorEl={toolbarEl}
        buttonProps={{ size: "small" }}
        filterName={`aspect-${aspectId}`}
        filterStateSelector={filterStateSelector}
        filterActions={PerspectivesActions}
        tableInfoOptions={tableInfoOptions}
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
