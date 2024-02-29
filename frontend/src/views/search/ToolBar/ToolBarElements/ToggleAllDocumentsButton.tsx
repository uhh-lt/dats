import Checkbox from "@mui/material/Checkbox";
import * as React from "react";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";

interface ToggleAllDocumentsButtonProps {
  sdocIds: number[];
}

function ToggleAllDocumentsButton({ sdocIds }: ToggleAllDocumentsButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);

  // ui event handlers
  const handleToggleAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      dispatch(SearchActions.setSelectedDocuments(sdocIds));
      return;
    }
    dispatch(SearchActions.clearSelectedDocuments());
  };

  return (
    <>
      <Checkbox
        color="primary"
        indeterminate={numSelectedDocuments > 0 && numSelectedDocuments < sdocIds.length}
        checked={numSelectedDocuments === sdocIds.length}
        onChange={handleToggleAllClick}
        inputProps={{
          "aria-label": "select all desserts",
        }}
      />
    </>
  );
}

export default ToggleAllDocumentsButton;
