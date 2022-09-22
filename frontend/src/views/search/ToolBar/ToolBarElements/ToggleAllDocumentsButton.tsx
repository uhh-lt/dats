import Checkbox from "@mui/material/Checkbox";
import * as React from "react";
import { useEffect, useMemo } from "react";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";

interface ToggleAllDocumentsButtonProps {
  searchResultIds: number[];
}

function ToggleAllDocumentsButton({ searchResultIds }: ToggleAllDocumentsButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const numSelectedDocuments = useAppSelector((state) => state.search.selectedDocumentIds.length);
  const page = useAppSelector((state) => state.search.page);
  const rowsPerPage = useAppSelector((state) => state.search.rowsPerPage);

  // computed
  const numTotalDocuments = useMemo(
    () => searchResultIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length,
    [page, rowsPerPage, searchResultIds]
  );

  // effects
  // clear all selected documents when the page changes
  useEffect(() => {
    dispatch(SearchActions.clearSelectedDocuments());
  }, [dispatch, page, rowsPerPage]);

  // ui event handlers
  const handleToggleAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      dispatch(
        SearchActions.setSelectedDocuments(searchResultIds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage))
      );
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
    </>
  );
}

export default ToggleAllDocumentsButton;
