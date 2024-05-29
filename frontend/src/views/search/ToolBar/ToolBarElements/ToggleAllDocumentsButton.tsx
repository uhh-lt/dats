import Checkbox from "@mui/material/Checkbox";
import * as React from "react";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";

interface ToggleAllDocumentsButtonProps {
  sdocIds: number[];
  numSelectedDocuments: number;
}

function ToggleAllDocumentsButton({ sdocIds, numSelectedDocuments }: ToggleAllDocumentsButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

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
