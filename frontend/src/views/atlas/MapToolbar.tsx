import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, TextField } from "@mui/material";
import { ChangeEvent, useRef, useState } from "react";
import ReduxFilterDialog from "../../components/FilterDialog/ReduxFilterDialog.tsx";
import DATSToolbar from "../../components/MUI/DATSToolbar.tsx";
import { selectSelectedDocumentIds } from "../../components/tableSlice.ts";
import TagMenuButton from "../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import SearchOptionsMenu from "../search/DocumentSearch/SearchOptionsMenu.tsx";
import { AtlasActions } from "./atlasSlice.ts";

const filterStateSelector = (state: RootState) => state.atlas;
const filterName = "root";

function MapToolbar() {
  // selection
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.search));

  // filter dialog
  const toolbarRef = useRef<HTMLDivElement>(null);

  // search bar
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  return (
    <DATSToolbar variant="dense" ref={toolbarRef}>
      <ReduxFilterDialog
        anchorEl={toolbarRef.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={AtlasActions}
        transformOrigin={{ horizontal: "left", vertical: "top" }}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
      />
      {selectedDocumentIds.length > 0 && (
        <>
          <TagMenuButton
            selectedSdocIds={selectedDocumentIds}
            popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
          />
        </>
      )}
      <Box sx={{ flexGrow: 1 }} />
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
      <SearchOptionsMenu />
    </DATSToolbar>
  );
}

export default MapToolbar;
