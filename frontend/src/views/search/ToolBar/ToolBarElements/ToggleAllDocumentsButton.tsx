import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useMemo } from "react";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";

interface ToggleAllDocumentsButtonProps {
  searchResultIds: number[];
}

function ToggleAllDocumentsButton({ searchResultIds }: ToggleAllDocumentsButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);

  // computed
  const numTotalDocuments = useMemo(() => searchResultIds.length, [searchResultIds]);

  // ui event handlers
  const handleToggleAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      dispatch(SearchActions.setSelectedDocuments(searchResultIds));
      return;
    }
    dispatch(SearchActions.clearSelectedDocuments());
  };

  return (
    <>
      <Checkbox
        color="primary"
        indeterminate={numSelectedDocuments > 0 && numSelectedDocuments < numTotalDocuments}
        checked={numTotalDocuments > 0 && numSelectedDocuments === numTotalDocuments}
        onChange={handleToggleAllClick}
        inputProps={{
          "aria-label": "select all desserts",
        }}
      />
      {numSelectedDocuments > 0 && (
        <Typography color="inherit" variant="subtitle1" component="div">
          {numSelectedDocuments} selected
        </Typography>
      )}
    </>
  );
}

export default ToggleAllDocumentsButton;
